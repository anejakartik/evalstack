"""Accuracy judge — LLM-as-judge scoring semantic correctness vs an expected answer.

If no `expected` is in event metadata, falls back to a "factual coherence" rubric.
"""

from __future__ import annotations

import os
from textwrap import dedent

from openai import OpenAI

from evalstack.models import Event, JudgeResult


JUDGE_MODEL = os.environ.get("EVALSTACK_JUDGE_MODEL", "gpt-4o-mini")

_client: OpenAI | None = None


def _client_lazy() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI()
    return _client


def score(event: Event) -> JudgeResult:
    expected = event.metadata.get("expected")

    if expected:
        prompt = dedent(f"""
            You are an evaluation judge. Score the assistant's response for factual
            accuracy against the expected answer. Return a single number 0.0-1.0
            on the first line, followed by a one-sentence justification.

            Question: {event.prompt}

            Expected: {expected}

            Actual: {event.completion}
        """).strip()
    else:
        prompt = dedent(f"""
            You are an evaluation judge. Score the assistant's response for factual
            coherence and absence of obvious hallucination. Return a single number
            0.0-1.0 on the first line, followed by a one-sentence justification.

            Question: {event.prompt}

            Response: {event.completion}
        """).strip()

    try:
        resp = _client_lazy().chat.completions.create(
            model=JUDGE_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=200,
        )
        text = (resp.choices[0].message.content or "").strip()
        score_val, reasoning = _parse_score(text)
    except Exception as exc:
        score_val, reasoning = 0.0, f"Judge call failed: {exc}"

    return JudgeResult(
        event_id=event.id,
        judge_name="accuracy",
        score=score_val,
        reasoning=reasoning,
    )


def _parse_score(text: str) -> tuple[float, str]:
    """Pull a 0-1 float from the first line; rest is reasoning."""
    lines = text.split("\n", 1)
    first = lines[0].strip()
    rest = lines[1].strip() if len(lines) > 1 else first
    # tolerate "0.85" or "0.85/1.0" or "Score: 0.85"
    import re
    m = re.search(r"([01](?:\.\d+)?|0?\.\d+)", first)
    if not m:
        return 0.0, f"Could not parse score from: {first!r}"
    val = float(m.group(1))
    if val > 1.0:
        val = val / 100.0 if val <= 100 else 1.0
    return max(0.0, min(1.0, val)), rest
