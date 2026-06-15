# Demo — evalstack

## Live demo

**URL:** [evalstack.kartikaneja.com](https://evalstack.kartikaneja.com) *(coming soon — pending Fly.io + Vercel deploy)*

**Hosting plan:**
- Server: Fly.io free tier (512MB shared VM)
- Dashboard: Vercel free hobby tier
- DB: Neon Postgres free tier (when SQLite → Postgres migration ships)
- Cost: $0/month under demo traffic

## What to try (when live)

1. Open the dashboard → click **"Sample eval"**
2. See the eval cases + judge verdict per case + diff against the previous run
3. Click any case for the full input/output/judge-reasoning trace
4. Try **"Re-run with GPT-4-mini"** to see the same eval against a cheaper model

## Local demo right now

```bash
git clone https://github.com/anejakartik/evalstack.git
cd evalstack
pip install -e ./sdk
export OPENAI_API_KEY=sk-...

# Start the server (SQLite, no Postgres needed)
docker compose up -d server

# Run the sample eval
python examples/quickstart.py

# View results
curl http://localhost:8000/runs | jq
```

## Recorded walkthrough

*(coming after dashboard is live — target 30-second screen recording showing: run eval → see results → diff prompts → re-run)*

## Quick port-forward demo (during a live conversation)

If you want to show your local server to someone remote:

```bash
# Cloudflare Tunnel (recommended)
cloudflared tunnel --url http://localhost:8000

# OR ngrok
ngrok http 8000

# OR VS Code port forwarding (Ports panel → right-click → Make Public)
```

## Demo data + reset

- The hosted demo will reset SQLite/Postgres every 24h via cron
- No user data persists — safe to throw arbitrary content at it
- Want persistence? Self-host.
