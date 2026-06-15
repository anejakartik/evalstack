"""evalstack CLI — `evalstack run <eval.yaml>` and friends."""

from __future__ import annotations

import sys
from pathlib import Path

import click
import yaml

from evalstack.client import Client, get_client
from evalstack.models import EvalSuite


@click.group()
@click.version_option()
def main() -> None:
    """evalstack — drop-in LLM evaluation."""


@main.command()
@click.argument("suite_path", type=click.Path(exists=True, path_type=Path))
@click.option("--endpoint", help="evalstack server URL (default: env EVALSTACK_ENDPOINT or localhost:8000)")
@click.option("--compare-to", help="Run ID to diff against")
def run(suite_path: Path, endpoint: str | None, compare_to: str | None) -> None:
    """Run an eval suite from a YAML file."""
    client = Client(endpoint=endpoint) if endpoint else get_client()

    raw = yaml.safe_load(suite_path.read_text())
    suite = EvalSuite.model_validate(raw)

    click.echo(f"📦 Suite: {suite.name}")
    click.echo(f"   Cases: {len(suite.cases)}")
    click.echo(f"   Model: {suite.model}")
    click.echo(f"   Judges: {', '.join(suite.judges)}")
    click.echo()

    # NB: this CLI is a thin wrapper — the actual model-call + judge orchestration
    # lives on the server side in v0.2. For now, we just list what would run.
    for i, case in enumerate(suite.cases, 1):
        preview = case.input[:60].replace("\n", " ") + ("…" if len(case.input) > 60 else "")
        click.echo(f"  [{i:2d}] {case.name:30s}  {preview}")

    click.echo()
    click.echo("⚠️  Server-side execution not yet wired (v0.2).")
    click.echo("    For now, run cases in your app code with @evalstack.trace")
    click.echo("    and use the server dashboard to view results.")
    sys.exit(0)


@main.command()
@click.argument("endpoint", required=False)
def health(endpoint: str | None) -> None:
    """Check whether an evalstack server is reachable."""
    client = Client(endpoint=endpoint) if endpoint else get_client()
    try:
        # Reuse list_events as a cheap health probe
        events = client.list_events(limit=1)
        click.echo(f"✅ Server reachable at {client.endpoint}")
        click.echo(f"   Events seen: {len(events)}")
    except Exception as exc:
        click.echo(f"❌ Server NOT reachable at {client.endpoint}")
        click.echo(f"   Error: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
