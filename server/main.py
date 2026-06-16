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
from fastapi.middleware.cors import CORSMiddleware
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

_cors_origins = os.environ.get("EVALSTACK_CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
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
        return [_row_to_run(r) for r in rows]


@app.get("/runs/{run_id}", response_model=Run)
def get_run(run_id: UUID) -> Run:
    with Session(engine) as session:
        row = session.get(RunRow, str(run_id))
        if row is None:
            raise HTTPException(404, "Run not found")
        return _row_to_run(row)


@app.get("/events/{event_id}", response_model=Event)
def get_event(event_id: UUID) -> Event:
    with Session(engine) as session:
        row = session.get(EventRow, str(event_id))
        if row is None:
            raise HTTPException(404, "Event not found")
        return _row_to_event(row)


@app.get("/judge-results", response_model=list[JudgeResult])
def list_judge_results(
    event_id: UUID | None = Query(default=None),
    limit: int = Query(default=500, le=5000),
) -> list[JudgeResult]:
    """Return stored judge results, optionally filtered by event_id."""
    with Session(engine) as session:
        stmt = select(JudgeResultRow)
        if event_id is not None:
            stmt = stmt.where(JudgeResultRow.event_id == str(event_id))
        stmt = stmt.order_by(JudgeResultRow.timestamp.desc()).limit(limit)
        rows = session.exec(stmt).all()
        return [
            JudgeResult(
                event_id=UUID(r.event_id),
                judge_name=r.judge_name,
                score=r.score,
                reasoning=r.reasoning,
                timestamp=r.timestamp.replace(tzinfo=timezone.utc)
                if r.timestamp.tzinfo is None
                else r.timestamp,
            )
            for r in rows
        ]


def _row_to_run(row: RunRow) -> Run:
    return Run(
        id=UUID(row.id),
        name=row.name,
        created_at=row.created_at.replace(tzinfo=timezone.utc)
        if row.created_at.tzinfo is None
        else row.created_at,
        suite_path=row.suite_path,
    )
