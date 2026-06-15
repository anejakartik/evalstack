"""evalstack — drop-in LLM evaluation SDK.

Public API:
    @evalstack.trace          — decorator that captures LLM calls
    evalstack.log(event)      — manual event log
    evalstack.configure(...)  — set endpoint, api key, defaults
    evalstack.eval.run(...)   — run an eval suite
"""

from evalstack.client import Client, configure, get_client, log, trace
from evalstack.models import Event, EvalCase, EvalSuite, JudgeResult, Run

__all__ = [
    "Client",
    "Event",
    "EvalCase",
    "EvalSuite",
    "JudgeResult",
    "Run",
    "configure",
    "get_client",
    "log",
    "trace",
]
__version__ = "0.1.0"
