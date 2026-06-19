"""Helpfulness judge — rubric-driven scoring of how useful a response is.

Doesn't need an expected answer; uses an LLM-as-judge with a fixed rubric.
"""

from __future__ import annotations

import os
from textwrap import dedent

from openai import OpenAI

from evalstack.models import Event, JudgeResult


JUDGE_MODEL = os.environ.get("EVALSTACK_JUDGE_MODEL", "gpt-4o-mini")

_client: OpenAI | None = None


RUBRIC = dedent("""
    Score 0.0–1.0 on how helpful the assistant's response is to the user's question:
      - 1.0: directly answers, clear, actionable
      - 0.7: mostly answers, minor gaps or unclear bits
      - 0.4: partially answers; vague or distracting
      - 0.1: avoids the question, hedges excessively, or off-topic
      - 0.0: refuses without justification or returns nonsense

    Return the number on the first line, then one sentence justifying the score.
""").strip()


def _client_lazy() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI()
    return _client


def score(event: Event) -> JudgeResult:
    prompt = dedent(f"""
        {RUBRIC}

        Question: {event.prompt}

        Response: {event.completion}
    """).strip()

    if not os.environ.get("OPENAI_API_KEY"):
        return JudgeResult(
            event_id=event.id,
            judge_name="helpfulness",
            score=0.0,
            reasoning="skipped: OPENAI_API_KEY not set on the server",
        )

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
        judge_name="helpfulness",
        score=score_val,
        reasoning=reasoning,
    )


def _parse_score(text: str) -> tuple[float, str]:
    import re
    lines = text.split("\n", 1)
    first = lines[0].strip()
    rest = lines[1].strip() if len(lines) > 1 else first
    m = re.search(r"([01](?:\.\d+)?|0?\.\d+)", first)
    if not m:
        return 0.0, f"Could not parse score from: {first!r}"
    val = float(m.group(1))
    if val > 1.0:
        val = val / 100.0 if val <= 100 else 1.0
    return max(0.0, min(1.0, val)), rest
