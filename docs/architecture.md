# Architecture — evalstack

## High-level flow

```mermaid
flowchart LR
  A[Your app] -->|@evalstack.trace| B[SDK]
  B -->|HTTP POST /events| C[evalstack server]
  C -->|insert| D[(SQLite/Postgres)]
  C -->|judge request| E[LLM-as-judge]
  E -->|score| C
  C -->|GET /runs| F[Dashboard]
  G[CI / GitHub Action] -->|run eval.yaml| C
  G -->|check threshold| H{Pass?}
  H -->|no| I[Fail PR]
```

## Components

### SDK (`sdk/`)

- One Python package, light deps (`httpx`, `pydantic`)
- Exposes `@evalstack.trace`, `evalstack.log(event)`, `evalstack.eval.run(suite)`
- No telemetry without explicit configuration
- < 5ms overhead per traced LLM call (target)

### Server (`server/`)

- FastAPI app
- Endpoints:
  - `POST /events` — ingest a traced LLM call
  - `GET /events` — list events with filters (model, run_id, time)
  - `POST /evals/run` — execute a judge on a set of events
  - `GET /runs` — list eval runs with their summary scores
  - `GET /runs/{run_id}/diff?compare={other_run_id}` — judge-score diff between two runs
- Storage: SQLite for local / Postgres for production
- Runs on 512MB Fly.io VM

### Judges (`server/judges/`)

- One Python file per rubric (`accuracy.py`, `helpfulness.py`)
- Each implements `Judge.score(event) -> JudgeResult`
- LLM-backed (configurable model via env var)
- ≤ 100 LOC per judge (forced simplicity)

### Dashboard (`web/`) *(planned)*

- Next.js, Vercel-hosted
- Pages: runs list, run detail, event drill-down, diff view
- Pulls from server REST API

## Data model

```python
class Event(BaseModel):
    id: UUID
    run_id: UUID | None
    timestamp: datetime
    model: str                    # e.g. "openai/gpt-4o"
    prompt: str
    completion: str
    metadata: dict[str, Any]      # tags, user_id, latency, tokens, cost

class Run(BaseModel):
    id: UUID
    name: str
    created_at: datetime
    suite_path: str | None        # source eval.yaml

class JudgeResult(BaseModel):
    event_id: UUID
    judge_name: str               # "accuracy", "helpfulness"
    score: float                  # 0–1
    reasoning: str
    timestamp: datetime
```

## Design decisions

| Decision | Rationale |
|---|---|
| SQLite default, Postgres optional | Zero-config local dev. Postgres before public hosted demo. |
| LLM-as-judge over fine-tuned judge | Reproducible without GPUs. Model = config flag. |
| CLI first, dashboard second | Practitioners want CI-driven workflow; dashboard is for reading results. |
| No LangChain in SDK | SDK must stay light (<5ms overhead, <500KB install). LangChain pulls 50+ transitive deps. |
| Synchronous ingest first | Async batching deferred to ROADMAP — simpler protocol for v0.1 |
| GitHub Action for CI gating | Where the actual user pain lives — block PRs on regression |

## Non-goals (architectural)

- **Distributed tracing** — that's [`tracelens`](https://github.com/anejakartik/tracelens). evalstack focuses on eval; tracelens focuses on observability. They compose.
- **Prompt management** — leave that to PromptLayer / git. evalstack consumes prompts, doesn't store/version them.
- **Streaming evals** — batch mode only for v0.1.
