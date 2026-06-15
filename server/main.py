"""evalstack server — FastAPI ingest + judge orchestration.

Designed to run on a 512MB Fly.io VM. SQLite by default; swap to Postgres via env.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Field, Session, SQLModel, create_engine, select

# Make `sdk` importable when running from repo root for shared models
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "sdk"))
from evalstack.models import Event, JudgeResult, Run  # noqa: E402

from judges.accuracy import score as score_accuracy
from judges.helpfulness import score as score_helpfulness


DATABASE_URL = os.environ.get("EVALSTACK_DB_URL", "sqlite:///./evalstack.db")
engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})


# ---- DB models (SQLModel) — mirror SDK Event/Run/JudgeResult ---------------

class EventRow(SQLModel, table=True):
    id: str = Field(primary_key=True)
    run_id: str | None = Field(default=None, index=True)
    timestamp: datetime
    model: str
    prompt: str
    completion: str
    meta_json: str = Field(default="{}")


class RunRow(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    created_at: datetime
    suite_path: str | None = None


class JudgeResultRow(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    event_id: str = Field(index=True)
    judge_name: str
    score: float
    reasoning: str
    timestamp: datetime


# ---- Helpers ---------------------------------------------------------------

def _event_to_row(event: Event) -> EventRow:
    import json
    return EventRow(
        id=str(event.id),
        run_id=str(event.run_id) if event.run_id else None,
        timestamp=event.timestamp,
        model=event.model,
        prompt=event.prompt,
        completion=event.completion,
        meta_json=json.dumps(event.metadata),
    )


def _row_to_event(row: EventRow) -> Event:
    import json
    return Event(
        id=UUID(row.id),
        run_id=UUID(row.run_id) if row.run_id else None,
        timestamp=row.timestamp.replace(tzinfo=timezone.utc) if row.timestamp.tzinfo is None else row.timestamp,
        model=row.model,
        prompt=row.prompt,
        completion=row.completion,
        metadata=json.loads(row.meta_json),
    )


# ---- App -------------------------------------------------------------------

app = FastAPI(
    title="evalstack",
    version="0.1.0",
    description="Open-source LLM evaluation server",
)


@app.on_event("startup")
def on_startup() -> None:
    SQLModel.metadata.create_all(engine)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "evalstack",
        "version": "0.1.0",
        "docs": "/docs",
        "github": "https://github.com/anejakartik/evalstack",
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "db_url": DATABASE_URL.split("@")[-1]}


@app.post("/events", response_model=Event)
def ingest_event(event: Event) -> Event:
    """Receive a traced LLM call from the SDK."""
    with Session(engine) as session:
        session.add(_event_to_row(event))
        session.commit()
    return event


@app.get("/events", response_model=list[Event])
def list_events(
    run_id: UUID | None = Query(default=None),
    limit: int = Query(default=100, le=1000),
) -> list[Event]:
    with Session(engine) as session:
        stmt = select(EventRow)
        if run_id is not None:
            stmt = stmt.where(EventRow.run_id == str(run_id))
        stmt = stmt.order_by(EventRow.timestamp.desc()).limit(limit)
        rows = session.exec(stmt).all()
        return [_row_to_event(r) for r in rows]


class JudgeRunRequest(BaseModel):
    judge_name: str
    run_id: UUID | None = None
    event_ids: list[UUID] | None = None


@app.post("/evals/run")
def run_judge(req: JudgeRunRequest) -> dict[str, Any]:
    """Run a judge over a set of events. Returns per-event scores + run summary."""
    judges = {"accuracy": score_accuracy, "helpfulness": score_helpfulness}
    if req.judge_name not in judges:
        raise HTTPException(404, f"Unknown judge: {req.judge_name}. Available: {list(judges)}")

    judge_fn = judges[req.judge_name]

    # Resolve target events
    with Session(engine) as session:
        if req.event_ids:
            rows = [session.get(EventRow, str(eid)) for eid in req.event_ids]
            rows = [r for r in rows if r is not None]
        elif req.run_id is not None:
            rows = session.exec(select(EventRow).where(EventRow.run_id == str(req.run_id))).all()
        else:
            raise HTTPException(400, "Provide either run_id or event_ids")

        events = [_row_to_event(r) for r in rows]
        results: list[JudgeResult] = []
        for event in events:
            res = judge_fn(event)
            results.append(res)
            session.add(JudgeResultRow(
                event_id=str(res.event_id),
                judge_name=res.judge_name,
                score=res.score,
                reasoning=res.reasoning,
                timestamp=res.timestamp,
            ))
        session.commit()

    if not results:
        return {"summary": {"count": 0, "mean": None}, "results": []}
    mean = sum(r.score for r in results) / len(results)
    return {
        "summary": {"count": len(results), "mean": round(mean, 4)},
        "results": [r.model_dump(mode="json") for r in results],
    }


@app.get("/runs", response_model=list[Run])
def list_runs(limit: int = Query(default=50, le=500)) -> list[Run]:
    with Session(engine) as session:
        rows = session.exec(select(RunRow).order_by(RunRow.created_at.desc()).limit(limit)).all()
        return [
            Run(
                id=UUID(r.id),
                name=r.name,
                created_at=r.created_at.replace(tzinfo=timezone.utc) if r.created_at.tzinfo is None else r.created_at,
                suite_path=r.suite_path,
            )
            for r in rows
        ]
