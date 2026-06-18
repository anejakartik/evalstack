import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getRun,
  listEvents,
  listJudgeResults,
  type JudgeResult,
} from "@/lib/api";
import { formatTimestamp, shortId } from "@/lib/format";
import { EventCard } from "@/components/EventCard";
import { CompareSelector } from "@/components/CompareSelector";

export const dynamic = "force-dynamic";

export default async function RunDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let run: Awaited<ReturnType<typeof getRun>>;
  try {
    run = await getRun(params.id);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes(" 404 ")) notFound();
    throw e;
  }

  const events = await listEvents(params.id, 500);
  const judgesByEvent = new Map<string, JudgeResult[]>();
  await Promise.all(
    events.map(async (ev) => {
      const judges = await listJudgeResults(ev.id);
      judgesByEvent.set(ev.id, judges);
    })
  );

  const allJudgeScores = events.flatMap((ev) =>
    (judgesByEvent.get(ev.id) ?? []).map((j) => j.score)
  );
  const meanScore =
    allJudgeScores.length === 0
      ? null
      : allJudgeScores.reduce((s, n) => s + n, 0) / allJudgeScores.length;

  return (
    <div>
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-zinc-900"
      >
        ← All runs
      </Link>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{run.name}</h1>
          <div className="mt-1 flex gap-3 text-xs text-zinc-500">
            <span>id {shortId(run.id)}</span>
            <span>·</span>
            <span>{formatTimestamp(run.created_at)}</span>
            {run.suite_path && (
              <>
                <span>·</span>
                <span className="font-mono">{run.suite_path}</span>
              </>
            )}
          </div>
        </div>
        <Summary count={events.length} meanScore={meanScore} />
      </div>

      <section className="mt-6 space-y-3">
        {events.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600">
            No events recorded for this run yet.
          </div>
        ) : (
          events.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              judges={judgesByEvent.get(ev.id) ?? []}
            />
          ))
        )}
      </section>

      <CompareSelector
        events={events.map((ev) => ({
          id: ev.id,
          model: ev.model,
          timestamp: ev.timestamp,
        }))}
      />
    </div>
  );
}

function Summary({
  count,
  meanScore,
}: {
  count: number;
  meanScore: number | null;
}) {
  return (
    <div className="flex items-center gap-6 rounded-lg border border-zinc-200 bg-white px-4 py-2.5">
      <Stat label="Events" value={String(count)} />
      <div className="h-8 w-px bg-zinc-200" />
      <Stat
        label="Mean score"
        value={meanScore === null ? "—" : meanScore.toFixed(2)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-zinc-400">
        {label}
      </div>
      <div className="font-mono text-lg text-zinc-900">{value}</div>
    </div>
  );
}
