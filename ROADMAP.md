# Roadmap — evalstack

> Updated weekly. Add a dated entry per shipped feature. Each `[x]` is a potential LinkedIn post.

## Shipping log (newest on top)

### 2026-06-16 — Web dashboard P0 shipped
- [x] Next.js 14 + Tailwind dashboard at `web/`
- [x] Runs list (`/`) and run detail (`/runs/[id]`) pages — server-side fetch from FastAPI
- [x] New backend endpoints: `GET /runs/{id}`, `GET /events/{id}`, `GET /judge-results?event_id=`
- [x] CORS middleware on the server (configurable via `EVALSTACK_CORS_ORIGINS`)
- [x] `web` service added to `docker-compose.yml` — `docker compose up` brings up the full stack
- Notes: side-by-side diff and event detail page are follow-ups; current MVP gets you from "where are my runs?" to "what did the judges say?" in two clicks.

### 2026-06-15 — Alpha MVP scaffold
- [x] Repository structure + doc set (README / PRODUCT / ROADMAP / AGENTS / DEMO / architecture)
- [x] Python SDK skeleton with `@trace` decorator
- [x] FastAPI ingest server with SQLite storage
- [x] LLM-as-judge: accuracy + helpfulness rubrics
- [x] CLI scaffolding (`evalstack run <eval.yaml>`)
- [x] Working `quickstart.py` example
- Notes: doc-first approach — PRODUCT.md drives everything else. The 60-second quickstart is the key MVP metric.

---

## Short-term — next 4 weeks

Priority order. Pick from top.

- [ ] **P0 / Dashboard side-by-side diff** — compare two events / runs in one view, highlight prompt + completion + score deltas *(est. 0.5 day · post: "Why diff is the only eval feature that matters")*
- [ ] **P0 / Postgres backend** — swap SQLite → Postgres for multi-process safety *(est. 0.5 day · drives post "Why SQLite isn't enough for eval at scale")*
- [ ] **P0 / Deploy to Fly.io + Vercel** — live `evalstack.kartikaneja.com` demo
- [ ] **P0 / GitHub Action plugin** — `uses: anejakartik/evalstack-action@v1` to fail PRs on regression
- [ ] **P1 / Anthropic + Bedrock support** — beyond OpenAI
- [ ] **P1 / `eval.yaml` schema docs** — proper schema reference page
- [ ] **P1 / Sample eval suites** — RAG accuracy, JSON-output validation, safety screens
- [ ] **P2 / Streaming SDK** — track token-level latency

## Medium-term — months 2–3

- [ ] **A/B traffic split** — run two prompt variants on production traffic with statistical readout
- [ ] **Human-in-loop labeling UI** — collect ground truth from non-engineers
- [ ] **Cost optimization advisor** — "switch this prompt to GPT-4-mini, accuracy delta -2%, cost -85%"
- [ ] **Slack alerts** — regression detected → DM the on-call
- [ ] **Multi-tenant orgs + auth** (only if external users ask for it)
- [ ] **Synthetic test-case generation** — LLM-generated edge cases
- [ ] **Eval-of-evals** — meta-eval to check judge accuracy

## Long-term — 6+ months

- [ ] **Eval store marketplace** — community-shared eval suites
- [ ] **Managed cloud offering** (only if self-host adoption is real)
- [ ] **Browser extension** — eval-from-anywhere (Chrome devtools panel)

## Stretch / blue-sky

- LLM observability integration (point at `tracelens` server, eval automatically)
- Direct integration with prompt-management tools (PromptLayer, Helicone)
- Cost forecasting based on eval traffic patterns

---

## Content posts derived from this roadmap

| Feature | Post draft | Posted? | URL |
|---|---|---|---|
| Alpha MVP launch | `/posts/2026-06-launch.md` | _pending_ | _pending_ |
| Web dashboard | _pending_ | _pending_ | _pending_ |
| GitHub Action plugin | _pending_ | _pending_ | _pending_ |
| A/B traffic split | _pending_ | _pending_ | _pending_ |

## Decisions log

- **2026-06-15** — Started with **SQLite** over Postgres for the alpha because: zero-config local dev, lower deployment friction. Will swap to Postgres before public deploy (multi-process safety + Neon free tier is generous).
- **2026-06-15** — Picked **LLM-as-judge** over fine-tuned judge model because: reproducible without GPU infra, model choice is a config flag, lower op cost for self-hosters.
- **2026-06-15** — Decided **CLI-first + web second** because: practitioner workflow is "run from CI" not "click in UI"; dashboard is for reading results, not creating them.
