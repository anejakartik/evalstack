# AGENTS.md — instructions for AI coding agents

> If you're an AI agent (Claude Code, OpenAI Codex, Cursor agent, etc.) working on this repo, read this first.

## Before you touch code

1. Read [PRODUCT.md](./PRODUCT.md) — understand who this is for and what wedge we're pursuing.
2. Read the top of [ROADMAP.md](./ROADMAP.md) — what's actually prioritized right now.
3. Check open issues + existing PRs to avoid duplicating work.

## Coding conventions

- **Python:** type hints required, `ruff check` clean, `pytest` for tests
- **TypeScript:** strict mode, `eslint` clean, `vitest` for tests
- Prefer small focused PRs over sweeping changes
- Match existing patterns — don't introduce new abstractions without justification
- Avoid speculative generality (no "we might need this later")

## What to focus on

| You should | You should not |
|---|---|
| Fix bugs, polish UX, improve docs | Add features not in ROADMAP without asking |
| Write tests for the code you write | Refactor for refactoring's sake |
| Update ROADMAP.md shipping-log when you ship | Skip docs for "obvious" changes |
| Keep the SDK overhead < 5ms per traced call | Add deps that bloat the SDK |

## Repo-specific guardrails

- The **SDK** (`sdk/`) must stay light. No heavy deps (no LangChain, no SQLAlchemy). One client, one decorator, one config object.
- The **server** (`server/`) can have more deps but must run on a $5 Fly.io VM (512MB RAM).
- The **CLI** must be runnable from a fresh checkout in under 60 seconds (the README quickstart promise).
- Judge implementations live in `server/judges/` — one file per rubric, ≤ 100 lines each.

## Commits & PRs

- **Commit messages:** imperative mood, focused on *why*. Example: `Fail eval CI when judge score drops below threshold`
- **PR descriptions:** problem (1-2 lines) + change (2-3 lines) + test plan (bullets)
- **Squash on merge** — keeps history readable

## Things that will get a PR rejected

- Unjustified abstraction layers
- Vendor lock-in we didn't agree to (LangChain, LlamaIndex, etc.)
- Dependency additions without rationale
- Logic changes without tests
- Comments that restate what code does
- Skipping pre-commit hooks (`--no-verify`)
- Changes that break the 60-second quickstart

## How this repo deploys

- **CI:** `.github/workflows/ci.yml` runs on every push (lint + test)
- **Deploy:** TBD — Fly.io for server, Vercel for dashboard
- **Live demo:** `evalstack.kartikaneja.com` (coming soon)
- **Cost discipline:** demo runs on free tier; PRs that move workload to paid tier must flag it

## Companion document

- [.github/copilot-instructions.md](./.github/copilot-instructions.md) — same intent, formatted for GitHub Copilot's custom-instructions system
