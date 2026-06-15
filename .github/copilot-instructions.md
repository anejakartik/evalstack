# Copilot instructions for evalstack

> Same intent as [../AGENTS.md](../AGENTS.md), formatted for the Copilot custom-instructions system.

## Product context

This repo is **evalstack** — an open-source LLM evaluation framework. The full positioning is in [PRODUCT.md](../PRODUCT.md).

- **Target user:** AI Engineer at a 5–50 person startup running LLMs in production
- **Their pain:** No CI for prompts, no regression detection, no team visibility
- **Our wedge:** Drop-in SDK, CI-native (GitHub Action), free + self-hostable

## Code style

- **Python:** type hints, ruff, pytest
- **TypeScript:** strict mode, eslint, vitest
- Small focused changes
- Match existing patterns; don't add abstractions without justification
- No speculative generality

## When suggesting code

**Do:**
- Match conventions in `sdk/`, `server/`, and `tests/`
- Add type hints + tests with new logic
- Update [ROADMAP.md](../ROADMAP.md) shipping-log when shipping a roadmap item
- Use existing deps in `sdk/pyproject.toml` and `server/requirements.txt`

**Don't:**
- Add features not on the active roadmap without asking
- Restate what code does in comments
- Add LangChain / LlamaIndex (intentional non-goal — the SDK stays light)
- Skip pre-commit hooks
- Add deps that exceed the 512MB Fly.io VM constraint

## Repo layout

```
evalstack/
├── README.md, PRODUCT.md, ROADMAP.md, AGENTS.md, DEMO.md
├── .github/          # CI + deploy + copilot-instructions
├── docs/
│   └── architecture.md
├── sdk/              # Python SDK (light; no heavy deps)
│   ├── pyproject.toml
│   └── evalstack/
├── server/           # FastAPI server (can have more deps; runs on 512MB VM)
│   ├── requirements.txt
│   ├── main.py
│   └── judges/       # one rubric per file, ≤100 lines each
├── examples/
│   └── quickstart.py
├── tests/
└── docker-compose.yml
```

## Deployment

- CI: `.github/workflows/ci.yml`
- Deploy: TBD (Fly.io for server, Vercel for dashboard)
- Live demo: `evalstack.kartikaneja.com` *(coming soon)*
- Cost discipline: free tier only

## Companion docs

- [PRODUCT.md](../PRODUCT.md) — user/problem/solution
- [ROADMAP.md](../ROADMAP.md) — what's next
- [AGENTS.md](../AGENTS.md) — full agent guide
