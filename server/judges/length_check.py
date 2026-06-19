"""length_check judge — non-LLM smoke judge.

Scores 1.0 if the completion is in a reasonable length band (10–800 chars),
falling off linearly outside that. Doesn't call any external API, so it works
without an OPENAI_API_KEY — useful for local smoke tests and CI.
"""

from __future__ import annotations

from evalstack.models import Event, JudgeResult


GOOD_MIN = 10
GOOD_MAX = 800
HARD_MAX = 4000


def score(event: Event) -> JudgeResult:
    n = len(event.completion or "")
    if n == 0:
        return JudgeResult(
            event_id=event.id,
            judge_name="length_check",
            score=0.0,
            reasoning="empty completion",
        )
    if GOOD_MIN <= n <= GOOD_MAX:
        return JudgeResult(
            event_id=event.id,
            judge_name="length_check",
            score=1.0,
            reasoning=f"length {n} chars is within the {GOOD_MIN}-{GOOD_MAX} target band",
        )
    if n < GOOD_MIN:
        ratio = n / GOOD_MIN
        return JudgeResult(
            event_id=event.id,
            judge_name="length_check",
            score=round(ratio, 2),
            reasoning=f"length {n} chars is below the {GOOD_MIN} minimum (possibly truncated)",
        )
    # n > GOOD_MAX
    if n >= HARD_MAX:
        return JudgeResult(
            event_id=event.id,
            judge_name="length_check",
            score=0.1,
            reasoning=f"length {n} chars far exceeds {HARD_MAX} hard ceiling (likely runaway)",
        )
    # Linear falloff from 1.0 at GOOD_MAX → 0.3 at HARD_MAX
    excess = (n - GOOD_MAX) / (HARD_MAX - GOOD_MAX)
    score_val = round(1.0 - 0.7 * excess, 2)
    return JudgeResult(
        event_id=event.id,
        judge_name="length_check",
        score=score_val,
        reasoning=f"length {n} chars exceeds the {GOOD_MAX} target (downscaled)",
    )
