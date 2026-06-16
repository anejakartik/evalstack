# evalstack

> Open-source LLM evaluation for teams that don't want to pay $300/month for Braintrust.

**Live demo:** [evalstack.kartikaneja.com](https://evalstack.kartikaneja.com) *(coming soon)*
**Status:** alpha · last shipped 2026-06-15
**Built by:** [Kartik Aneja](https://kartikaneja.com) — AI/ML Platform Engineer

[![CI](https://github.com/anejakartik/evalstack/actions/workflows/ci.yml/badge.svg)](https://github.com/anejakartik/evalstack/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

---

## Why this exists

You ship an LLM feature. You iterate on the prompt. You ship again. Last week's regression resurfaces. You have no idea.

See [PRODUCT.md](./PRODUCT.md) for the full writeup. TL;DR:

- **Who:** AI Engineer at a 5–50 person startup running OpenAI or Anthropic in production
- **Pain:** No CI for prompts. No regression detection. Excel sheets and Slack screenshots.
- **Why now:** LLM eval is the #1 underserved 2026 topic. Braintrust raised $36M but is closed + paid.

## What works today (alpha MVP)

- **Python SDK** — one decorator (`@evalstack.trace`) captures LLM calls + outputs
- **FastAPI server** — receives traces, runs configured judges, stores results in SQLite (Postgres next)
- **LLM-as-judge** — accuracy + helpfulness rubrics out of the box, fully extensible
- **CLI** — `evalstack run <eval.yaml>` runs a suite of eval cases and prints a diff
- **Web dashboard** — Next.js + Tailwind UI for browsing runs, events, and judge scores

## Try it (60 seconds, local)

```bash
git clone https://github.com/anejakartik/evalstack.git
cd evalstack
pip install -e ./sdk
export OPENAI_API_KEY=sk-...
docker compose up -d              # starts FastAPI server (:8000) + Next.js dashboard (:3000)
python examples/quickstart.py     # runs a sample eval
open http://localhost:3000        # browse runs in the dashboard
```

## Architecture

See [docs/architecture.md](./docs/architecture.md). Stack: Python + FastAPI + SQLite (→ Postgres) + Next.js dashboard, deployed on Fly.io + Vercel.

## What's next

See [ROADMAP.md](./ROADMAP.md). Top items: web dashboard, Postgres backend, A/B traffic split, Slack alerts on regression.

## Contributing

PRs welcome. See [AGENTS.md](./AGENTS.md) if you're an AI coding agent working on this repo.

## License

MIT — see [LICENSE](./LICENSE).
