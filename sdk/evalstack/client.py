"""evalstack client: HTTP wrapper + @trace decorator.

Lightweight by design: only depends on httpx + pydantic.
"""

from __future__ import annotations

import functools
import os
from collections.abc import Callable
from typing import Any
from uuid import UUID

import httpx

from evalstack.models import Event


_default_client: Client | None = None


class Client:
    """HTTP client for the evalstack server.

    Designed to fail soft: a server outage should not break the calling app.
    Errors are logged but never raised from `log()` or the `@trace` decorator
    by default. Set strict=True to surface errors during local dev.
    """

    def __init__(
        self,
        endpoint: str | None = None,
        api_key: str | None = None,
        timeout: float = 5.0,
        strict: bool = False,
    ) -> None:
        self.endpoint = (endpoint or os.environ.get("EVALSTACK_ENDPOINT") or "http://localhost:8000").rstrip("/")
        self.api_key = api_key or os.environ.get("EVALSTACK_API_KEY")
        self.timeout = timeout
        self.strict = strict
        headers = {"User-Agent": "evalstack-sdk/0.1.0"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        self._http = httpx.Client(timeout=timeout, headers=headers)

    def log(self, event: Event) -> Event:
        """POST an event to the server. Returns the (possibly server-augmented) event."""
        try:
            resp = self._http.post(f"{self.endpoint}/events", json=event.model_dump(mode="json"))
            resp.raise_for_status()
            return Event.model_validate(resp.json())
        except Exception as exc:
            if self.strict:
                raise
            # fail soft — log to stderr and return the original event
            import sys
            print(f"[evalstack] log failed (non-fatal): {exc}", file=sys.stderr)
            return event

    def list_events(self, run_id: UUID | None = None, limit: int = 100) -> list[Event]:
        params: dict[str, Any] = {"limit": limit}
        if run_id is not None:
            params["run_id"] = str(run_id)
        resp = self._http.get(f"{self.endpoint}/events", params=params)
        resp.raise_for_status()
        return [Event.model_validate(e) for e in resp.json()]

    def run_judge(self, judge_name: str, run_id: UUID) -> dict[str, Any]:
        payload = {"judge_name": judge_name, "run_id": str(run_id)}
        resp = self._http.post(f"{self.endpoint}/evals/run", json=payload)
        resp.raise_for_status()
        return resp.json()


def configure(
    endpoint: str | None = None,
    api_key: str | None = None,
    timeout: float = 5.0,
    strict: bool = False,
) -> Client:
    """Configure the module-level default client.

    Returns the new client so tests can capture it.
    """
    global _default_client
    _default_client = Client(endpoint=endpoint, api_key=api_key, timeout=timeout, strict=strict)
    return _default_client


def get_client() -> Client:
    global _default_client
    if _default_client is None:
        _default_client = Client()
    return _default_client


def log(event: Event) -> Event:
    """Module-level convenience: log an event with the default client."""
    return get_client().log(event)


def trace(
    *,
    model: str | None = None,
    extract: Callable[[Any], tuple[str, str]] | None = None,
    metadata: dict[str, Any] | None = None,
):
    """Decorator that captures the prompt + completion from an LLM call.

    Usage:
        @evalstack.trace(model="openai/gpt-4o")
        def ask(question: str) -> str:
            return openai.chat.completions.create(...).choices[0].message.content

    For richer extraction (e.g. raw OpenAI response with tokens), pass `extract`:

        @evalstack.trace(extract=lambda resp: (resp.input, resp.output_text))
        def ask(...): ...
    """
    def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            result = fn(*args, **kwargs)
            if extract is not None:
                prompt, completion = extract(result)
            else:
                # default: first positional arg is the prompt, return value is the completion
                prompt = str(args[0]) if args else str(kwargs.get("prompt", ""))
                completion = str(result)
            event = Event(
                model=model or "unknown",
                prompt=prompt,
                completion=completion,
                metadata=metadata or {},
            )
            log(event)
            return result

        return wrapper

    return decorator
