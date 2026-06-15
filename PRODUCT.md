# Product — evalstack

> The "why" behind this repo. Read first if you're an AI agent contributing.

## Target user

**Persona:** AI Engineer at a 5–50 person startup. Owns LLM features in production. Reports to a CTO or Head of Eng who asks "is our LLM stuff working?" every standup.

**Job they're trying to do:** Ship LLM features confidently — knowing a prompt change didn't silently regress accuracy / cost / safety.

**Current workflow:** Hand-curated test cases in Notion. Run prompts in OpenAI Playground. Eyeball the results. Ship. Watch Slack for customer complaints. Maybe roll back.

## The pain

What hurts:

1. **No regression detection.** A "small prompt tweak" can drop accuracy 20% with no signal until customers notice.
2. **No CI integration.** Manual eval before every release is slow, gets skipped under pressure.
3. **No team visibility.** Eval results live in someone's laptop, not in a shared dashboard.
4. **No cost/quality trade-off view.** Choosing GPT-4 vs GPT-4-mini is a guess.

What it costs them: customer-trust hits, late-night incident response, slow feature velocity, $$$ on overkill models.

## Existing alternatives — and why they fall short

| Alternative | What it does | Why it doesn't fit |
|---|---|---|
| **Braintrust** | Full eval platform | $300+/month for small teams. Closed source. Vendor lock-in. |
| **LangSmith** | Tracing + evals | LangChain-only. Heavy. |
| **OpenAI Evals** | Open-source eval framework | CLI-only, no web UI, no CI plugin |
| **DIY (Excel + scripts)** | Custom eval logic | Brittle, no team visibility, no historical tracking |

## Our wedge

Why evalstack wins for this user in 2026:

1. **Drop-in SDK.** One decorator. Works with any LLM provider — OpenAI, Anthropic, Bedrock, Ollama, custom.
2. **CI-native.** GitHub Action fails the build if a prompt regression crosses a threshold.
3. **Free + self-hostable.** Run locally, on a $5 Fly.io box, or in their existing K8s cluster.
4. **Sane defaults.** Pre-built rubrics for accuracy / helpfulness / safety. Add your own in 20 lines.

## MVP scope

**Must-have (shipping in alpha):**
- Python SDK with `@trace` decorator + manual `eval.run()` API
- FastAPI server with `POST /events` (ingest) + `GET /runs` (list) + `POST /evals/run` (judge)
- SQLite storage (Postgres later)
- 2 LLM-as-judge rubrics: accuracy (semantic match), helpfulness (rubric-driven)
- CLI: `evalstack run <eval.yaml>` runs cases + prints comparison table
- Working `quickstart.py` example that someone can run in 60 seconds

**Out of scope for MVP** (deferred to [ROADMAP.md](./ROADMAP.md)):
- Web dashboard (Next.js — coming next)
- A/B traffic split
- Human-in-loop labeling
- Multi-tenant orgs / auth
- Postgres backend
- Slack alerts

## Success metric

How we know the MVP works:

- **Internal:** I can paste a screenshot of an eval comparison into a LinkedIn post and it's clearly readable
- **External:** 5+ GitHub stars within 4 weeks; 1+ inbound message from a real practitioner asking "how do I plug this in?"
- **Technical:** SDK overhead < 5ms per call; server handles 100 events/sec on a $5 Fly.io box

## What success looks like in 6 months

- 100+ self-hosted installs
- Featured in an MLOps / AI newsletter (Eugene Yan, Chip Huyen, or similar)
- Cited as a portfolio piece in 1+ recruiter screen

## Non-goals

What we explicitly will NOT do:

- **Enterprise features** — SSO, audit logs, fine-grained RBAC. Pay for Braintrust if you need these.
- **Custom training** — we don't train judge models from scratch. Use the LLMs already available.
- **Compete on managed hosting** — self-host first. Managed offering is years away.
