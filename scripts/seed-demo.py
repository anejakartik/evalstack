"""Seed an evalstack deployment with deterministic demo data.

Uses stdlib only (no SDK install needed). Posts runs + events + judge
results so the live dashboard shows realistic content for visitors.

Usage:
    # Local:
    EVALSTACK_API_BASE=http://localhost:8000 python3 scripts/seed-demo.py

    # Live deployment:
    EVALSTACK_API_BASE=https://evalstack-kartik.fly.dev python3 scripts/seed-demo.py
"""

import json
import os
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone


API = os.environ.get("EVALSTACK_API_BASE", "http://localhost:8000")


def post(path: str, body: dict) -> dict:
    req = urllib.request.Request(
        f"{API}{path}",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


# Two runs across a prompt-iteration A/B
BASELINE = [
    ("What is the capital of France?", "Paris is the capital of France."),
    ("What's 17 squared?", "17 squared is 289."),
    ("Who wrote Pride and Prejudice?", "Jane Austen wrote Pride and Prejudice in 1813."),
    ("Explain the bias-variance tradeoff in one sentence.", "The bias-variance tradeoff is the tension between underfitting (high bias) and overfitting (high variance) as model complexity changes."),
    ("What's the largest ocean by surface area?", "The Pacific Ocean is the largest ocean by surface area."),
    ("Who painted the Mona Lisa?", "Leonardo da Vinci painted the Mona Lisa around 1503-1519."),
    ("What is the speed of light in vacuum?", "Approximately 299,792 kilometers per second."),
    ("What year did the Berlin Wall fall?", "The Berlin Wall fell in 1989."),
]

# "Verified" variant: same questions, completions extended with a citation prefix
VERIFIED = [
    (q, f"[verified] {a}") for q, a in BASELINE
]


def create_run(name: str, suite_path: str, qa_pairs: list[tuple[str, str]], model: str) -> str:
    run_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    post(
        "/runs",
        {
            "id": run_id,
            "name": name,
            "created_at": now.isoformat(),
            "suite_path": suite_path,
        },
    )
    event_ids = []
    for i, (q, a) in enumerate(qa_pairs):
        ts = now - timedelta(seconds=(len(qa_pairs) - i) * 3)
        evt = {
            "id": str(uuid.uuid4()),
            "run_id": run_id,
            "timestamp": ts.isoformat(),
            "model": model,
            "prompt": q,
            "completion": a,
            "metadata": {},
        }
        post("/events", evt)
        event_ids.append(evt["id"])
    # Score with length_check (non-LLM, always works)
    post("/evals/run", {"judge_name": "length_check", "event_ids": event_ids})
    return run_id


def main() -> None:
    print(f"Seeding evalstack at {API} …")
    create_run(
        "demo-baseline-gpt-4o-mini",
        "examples/demo.yaml",
        BASELINE,
        "openai/gpt-4o-mini",
    )
    create_run(
        "demo-verified-prefix-gpt-4o-mini",
        "examples/demo.yaml",
        VERIFIED,
        "openai/gpt-4o-mini",
    )
    runs = json.loads(urllib.request.urlopen(f"{API}/runs").read())
    print(f"✓ {len(runs)} runs visible at {API}/runs")
    print(f"✓ open the dashboard to see them rendered with diffs + judges")


if __name__ == "__main__":
    main()
