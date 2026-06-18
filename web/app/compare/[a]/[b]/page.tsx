import Link from "next/link";
import { notFound } from "next/navigation";
import {
  type EvalEvent,
  type JudgeResult,
  listJudgeResults,
} from "@/lib/api";
import { formatTimestamp, scoreColor, shortId } from "@/lib/format";
import { DiffPane } from "@/components/DiffPane";

export const dynamic = "force-dynamic";

type FullEvent = { event: EvalEvent; judges: JudgeResult[] };

async function fetchFullEvent(id: string): Promise<FullEvent | null> {
  // We don't have a dedicated SDK helper, hit the backend directly.
  const base = process.env.EVALSTACK_API_BASE ?? "http://localhost:8000";
  const ev = await fetch(`${base}/events/${id}`, { cache: "no-store" });
  if (ev.status === 404) return null;
  if (!ev.ok) throw new Error(`event fetch failed: ${ev.status}`);
  const event = (await ev.json()) as EvalEvent;
  const judges = await listJudgeResults(id);
  return { event, judges };
}

export default async function ComparePage({
  params,
}: {
  params: { a: string; b: string };
}) {
  const [a, b] = await Promise.all([
    fetchFullEvent(params.a),
    fetchFullEvent(params.b),
  ]);
  if (!a || !b) notFound();

  const judgeKeys = new Set<string>();
  a.judges.forEach((j) => judgeKeys.add(j.judge_name));
  b.judges.forEach((j) => judgeKeys.add(j.judge_name));
  const judgeRows = Array.from(judgeKeys).sort();

  return (
    <div>
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
        ← All runs
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight">Diff</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Side-by-side comparison of two events.
        </p>
      </header>

      <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <EventMeta side="A" event={a.event} />
        <EventMeta side="B" event={b.event} />
      </section>

      <section className="mt-6 space-y-3">
        <DiffPane label="Prompt" left={a.event.prompt} right={b.event.prompt} />
        <DiffPane
          label="Completion"
          left={a.event.completion}
          right={b.event.completion}
        />
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white">
        <header className="border-b border-zinc-100 px-4 py-2 text-xs uppercase tracking-wide text-zinc-500">
          Judge scores
        </header>
        {judgeRows.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">
            No judge results recorded for either event.
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Judge</th>
                <th className="px-4 py-2 font-medium">A</th>
                <th className="px-4 py-2 font-medium">B</th>
                <th className="px-4 py-2 font-medium">Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {judgeRows.map((name) => {
                const ja = a.judges.find((j) => j.judge_name === name);
                const jb = b.judges.find((j) => j.judge_name === name);
                const delta =
                  ja !== undefined && jb !== undefined
                    ? jb.score - ja.score
                    : null;
                return (
                  <tr key={name}>
                    <td className="px-4 py-2 font-medium text-zinc-900">
                      {name}
                    </td>
                    <td className="px-4 py-2">
                      {ja ? <ScorePill score={ja.score} /> : <Missing />}
                    </td>
                    <td className="px-4 py-2">
                      {jb ? <ScorePill score={jb.score} /> : <Missing />}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {delta === null ? (
                        <Missing />
                      ) : delta === 0 ? (
                        <span className="text-zinc-500">±0.00</span>
                      ) : (
                        <span
                          className={
                            delta > 0
                              ? "text-emerald-700"
                              : "text-rose-700"
                          }
                        >
                          {delta > 0 ? "+" : ""}
                          {delta.toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function EventMeta({ side, event }: { side: string; event: EvalEvent }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-400">
        Event {side}
      </div>
      <div className="mt-1 font-mono text-xs text-zinc-500">
        {shortId(event.id)}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Field label="Model" value={event.model} mono />
        <Field label="When" value={formatTimestamp(event.timestamp)} />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-zinc-400">
        {label}
      </div>
      <div className={mono ? "font-mono text-zinc-800" : "text-zinc-800"}>
        {value}
      </div>
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 font-mono text-xs ${scoreColor(
        score
      )}`}
    >
      {score.toFixed(2)}
    </span>
  );
}

function Missing() {
  return <span className="text-zinc-300">—</span>;
}
