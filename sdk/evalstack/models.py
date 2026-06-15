"""Shared data models for SDK + server."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Event(BaseModel):
    """A single traced LLM call."""

    id: UUID = Field(default_factory=uuid4)
    run_id: UUID | None = None
    timestamp: datetime = Field(default_factory=utc_now)
    model: str
    prompt: str
    completion: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class Run(BaseModel):
    """A named collection of events grouped by an eval run."""

    id: UUID = Field(default_factory=uuid4)
    name: str
    created_at: datetime = Field(default_factory=utc_now)
    suite_path: str | None = None


class EvalCase(BaseModel):
    """A single test case in an eval suite (input + optional expected output)."""

    name: str
    input: str
    expected: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class EvalSuite(BaseModel):
    """Container for a set of eval cases loaded from a YAML file."""

    name: str
    cases: list[EvalCase]
    judges: list[str] = Field(default_factory=lambda: ["accuracy"])
    model: str = "openai/gpt-4o-mini"
    metadata: dict[str, Any] = Field(default_factory=dict)


class JudgeResult(BaseModel):
    """Output of a judge scoring one event."""

    event_id: UUID
    judge_name: str
    score: float  # 0.0 - 1.0
    reasoning: str
    timestamp: datetime = Field(default_factory=utc_now)
