"""evalstack quickstart — runs in under 60 seconds.

Prerequisites:
  pip install -e ./sdk
  pip install openai
  export OPENAI_API_KEY=sk-...
  docker compose up -d server  (or run uvicorn yourself)
"""

from __future__ import annotations

import os
from uuid import uuid4

import evalstack
from openai import OpenAI


# Point the SDK at the local server (default: http://localhost:8000)
evalstack.configure(endpoint=os.environ.get("EVALSTACK_ENDPOINT", "http://localhost:8000"))

oai = OpenAI()
RUN_ID = uuid4()


@evalstack.trace(model="openai/gpt-4o-mini", metadata={"run_id": str(RUN_ID)})
def ask(question: str) -> str:
    resp = oai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": question}],
        temperature=0.0,
    )
    return resp.choices[0].message.content or ""


SAMPLE_QUESTIONS = [
    "What is the capital of France?",
    "Who wrote 'Pride and Prejudice'?",
    "Explain the bias-variance tradeoff in one sentence.",
    "What's 17 squared?",
    "Is Python interpreted or compiled?",
]


def main() -> None:
    print(f"📦 Run ID: {RUN_ID}")
    print(f"   Asking {len(SAMPLE_QUESTIONS)} questions to gpt-4o-mini...")
    print()

    for q in SAMPLE_QUESTIONS:
        answer = ask(q)
        print(f"  Q: {q}")
        print(f"  A: {answer[:80]}{'…' if len(answer) > 80 else ''}")
        print()

    print(f"✅ {len(SAMPLE_QUESTIONS)} events logged to evalstack.")
    print(f"   View: curl http://localhost:8000/events | jq")
    print(f"   Judge with: curl -X POST http://localhost:8000/evals/run \\")
    print(f"     -H 'content-type: application/json' \\")
    print(f"     -d '{{\"judge_name\": \"helpfulness\", \"run_id\": \"{RUN_ID}\"}}' | jq")


if __name__ == "__main__":
    main()
