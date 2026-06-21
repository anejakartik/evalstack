# Deploy evalstack — server to Fly.io, dashboard to Vercel

> Outcome: `evalstack.kartikaneja.com` is a live, clickable demo of the
> dashboard, fed by a Fly.io-hosted FastAPI server, with realistic seeded
> data. ~30 active minutes; ~1 hr including waiting on DNS + cert provisioning.

---

## Prereqs (one-time)

```bash
brew install flyctl          # macOS — get the Fly CLI
flyctl auth signup           # OR: flyctl auth login (if you already have an account)
```

You'll also need a Vercel account (you already do — same one that deploys
kartikaneja.com). No Vercel CLI install needed; we'll use the UI.

---

## Step 1 — Deploy the FastAPI server to Fly.io

The `fly.toml` at the repo root is already configured: SQLite on a 3 GB
persistent volume, auto-stop when idle, HTTPS forced, CORS pre-configured to
allow the dashboard + portfolio domains.

```bash
cd ~/github/evalstack

# One-time setup. Accept the default name (or pick your own — fly will
# tell you if "evalstack-kartik" is taken).
flyctl launch --copy-config --no-deploy

# Create the persistent volume for SQLite
flyctl volume create evalstack_data --region iad --size 3 --yes

# First deploy
flyctl deploy

# Verify health
flyctl status
curl https://<your-fly-app>.fly.dev/health
# Expected: {"ok":true,"db":"sqlite:////app/data/evalstack.db"}
```

Note the URL flyctl assigns (e.g. `https://evalstack-kartik.fly.dev`) — you'll need it for Step 2.

### Seed demo data (one-time)

```bash
EVALSTACK_API_BASE=https://evalstack-kartik.fly.dev python3 scripts/seed-demo.py
```

This posts 2 runs × 8 events each with deterministic content so the
dashboard isn't an empty state for visitors.

---

## Step 2 — Deploy the Next.js dashboard to Vercel

1. Open https://vercel.com/new
2. Click "Import" next to your `anejakartik/evalstack` repo
3. **Set Root Directory:** `web` (critical — without this, Vercel builds from repo root and fails)
4. **Environment Variables** — add one:
   - Name: `EVALSTACK_API_BASE`
   - Value: `https://evalstack-kartik.fly.dev` (the Fly URL from Step 1, no trailing slash)
5. Click **Deploy**

Wait ~90 seconds for the build. You'll get a `https://evalstack-<hash>.vercel.app` URL. Visit it — should render the runs list with the 2 seeded runs.

If you see "Could not reach the evalstack server", recheck the
`EVALSTACK_API_BASE` env var spelling + value, then redeploy.

---

## Step 3 — Custom domain: evalstack.kartikaneja.com

In the Vercel project for `evalstack-web`:

1. **Settings → Domains → Add** → enter `evalstack.kartikaneja.com`
2. Vercel will show you a DNS record to add at your registrar (the place where you bought `kartikaneja.com`):
   - **Type:** CNAME
   - **Name:** `evalstack`
   - **Value:** `cname.vercel-dns.com`
3. Add that DNS record at your registrar
4. Back in Vercel, click "Refresh" — once DNS propagates (1-30 min), Vercel auto-provisions an SSL cert

Verify:

```bash
curl -I https://evalstack.kartikaneja.com
# Expected: HTTP/2 200, x-vercel-id: ...
```

If kartikaneja.com is itself hosted on Vercel under a different project (portfolio-site), this still works — subdomains can point to different Vercel projects.

---

## Step 4 — Link from the portfolio + READMEs

After the domain is live:

1. **Update evalstack/README.md** — replace `*(coming soon)*` next to the demo URL with the live link
2. **Update tracelens/dataask/lakehouseit READMEs** — they each reference their respective `*.kartikaneja.com` demo subdomains as "coming soon"; evalstack's now actually exists
3. **Update portfolio-site** — the evalstack project card on `/projects` can add a "View live →" link in addition to the GitHub link
4. **LinkedIn Featured carousel** — edit the Evalstack card description to add "Live demo: evalstack.kartikaneja.com" at the end (or replace the GitHub-only URL with the kartikaneja.com one)

---

## Cost expectations

| Service | Tier | Cost |
|---|---|---|
| Fly.io | Free (3× shared-cpu-1x VMs, 3 GB volumes, 160 GB egress/mo) | $0 |
| Vercel | Free (Hobby plan: unlimited static + 100 GB bandwidth + 1000 serverless invocations/day) | $0 |

If traffic ever exceeds Vercel's Hobby tier you'd see a $20/mo bill. Won't happen on a demo.

---

## Troubleshooting

**Vercel build fails with "Module not found"**: confirm Root Directory is set to `web` in Project Settings → General.

**Dashboard shows "Could not reach the evalstack server"**: the `EVALSTACK_API_BASE` env var on Vercel either isn't set or points at the wrong URL. Check Vercel → Project → Settings → Environment Variables. Redeploy after editing.

**Fly server returns 502**: machine probably cold-starting (idle auto-stop). First request takes 1-3 s; subsequent ones are fast. To keep the machine warm at the cost of a tiny amount of usage, edit `fly.toml`: `min_machines_running = 1` and redeploy.

**Custom domain stuck at "Invalid Configuration"**: DNS hasn't propagated yet. `dig evalstack.kartikaneja.com CNAME +short` should return `cname.vercel-dns.com`. If it doesn't, the DNS record didn't save at the registrar — re-add it.

**SQLite data gone after redeploy**: confirm the volume is mounted. `flyctl volumes list` should show `evalstack_data`. If it doesn't, repeat the `flyctl volume create` step.
