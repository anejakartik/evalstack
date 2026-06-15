"""Smoke tests — no external network. Make sure the SDK + models import cleanly."""

from __future__ import annotations

import evalstack
from evalstack.models import Event, EvalCase, EvalSuite, JudgeResult


def test_event_construct() -> None:
    e = Event(model="openai/gpt-4o", prompt="hi", completion="hello")
    assert e.id is not None
    assert e.model == "openai/gpt-4o"
    assert e.timestamp.tzinfo is not None


def test_eval_suite_roundtrip() -> None:
    suite = EvalSuite(
        name="t",
        cases=[EvalCase(name="c1", input="x", expected="y")],
    )
    dumped = suite.model_dump()
    parsed = EvalSuite.model_validate(dumped)
    assert parsed.cases[0].input == "x"


def test_judge_result_score_clamped() -> None:
    # JudgeResult itself doesn't clamp; that's the judge's responsibility.
    # But values outside 0..1 should still serialize fine.
    r = JudgeResult(event_id=Event(model="m", prompt="p", completion="c").id, judge_name="x", score=0.5, reasoning="ok")
    assert 0.0 <= r.score <= 1.0


def test_trace_decorator_no_server() -> None:
    """Decorator should be silent (fail-soft) when no server is running."""
    evalstack.configure(endpoint="http://localhost:1")  # bogus port

    @evalstack.trace(model="test-model")
    def echo(s: str) -> str:
        return s.upper()

    out = echo("hello")
    assert out == "HELLO"
