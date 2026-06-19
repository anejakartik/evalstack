import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getRun,
  listEvents,
  listJudgeResults,
  type JudgeResult,
} from "@/lib/api";
import { formatTimestamp, scoreColor, truncate } from "@/lib/format";
import { judgeStats, pairByPrompt, type RunBundle } from "@/lib/runStats";
import { JudgeHistogram } from "@/components/JudgeHistogram";

export const dynamic = "force-dynamic";

async function fetchBundle(runId: string): Promise<RunBundle> {
  const events = await listEvents(runId, 500);
  const judgesByEvent = new Map<string, JudgeResult[]>();
  await Promise.all(
    events.map(async (ev) => {
      const judges = await listJudgeResults(ev.id);
      judgesByEvent.set(ev.id, judges);
    })
  );
  return { events, judgesByEvent };
}

export default async function CompareRunsPage({
  params,
}: {
  params: { a: string; b: string };
}) {
  const [runA, runB] = await Promise.all([
    getRun(params.a).catch(() => null),
    getRun(params.b).catch(() => null),
  ]);
  if (!runA || !runB) notFound();

  const [bundleA, bundleB] = await Promise.all([
    fetchBundle(params.a),
    fetchBundle(params.b),
  ]);

  const statsA = judgeStats(bundleA);
  const statsB = judgeStats(bundleB);
  const judges = Array.from(
    new Set([...statsA.map((s) => s.judge), ...statsB.map((s) => s.judge)])
  ).sort();

  const matches = pairByPrompt(bundleA, bundleB);
  const intersecting = matches.filter((m) => m.delta !== null);
  const regressions = intersecting
    .filter((m) => (m.delta ?? 0) < 0)
    .slice(0, 5);
  const improvements = intersecting
    .filter((m) => (m.delta ?? 0) > 0)
    .slice(0, 5);

  return (
    <div>
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
        ← All runs
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight">Run diff</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Compare two evaluation runs across judges and matched prompts.
        </p>
      </header>

      <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <RunMeta side="A" runName={runA.name} createdAt={runA.created_at} suite={runA.suite_path} eventCount={bundleA.events.length} />
        <RunMeta side="B" runName={runB.name} createdAt={runB.created_at} suite={runB.suite_path} eventCount={bundleB.events.length} />
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white">
        <header className="border-b border-zinc-100 px-4 py-2 text-xs uppercase tracking-wide text-zinc-500">
          Judge means
        </header>
        {judges.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">
            No judge results recorded on either run.
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Judge</th>
                <th className="px-4 py-2 font-medium">A mean</th>
                <th className="px-4 py-2 font-medium">B mean</th>
                <th className="px-4 py-2 font-medium">Δ</th>
                <th className="px-4 py-2 font-medium">Score distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {judges.map((j) => {
                const a = statsA.find((s) => s.judge === j);
                const b = statsB.find((s) => s.judge === j);
                const delta =
                  a && b ? b.mean - a.mean : null;
                return (
                  <tr key={j}>
                    <td className="px-4 py-2 font-medium text-zinc-900">{j}</td>
                    <td className="px-4 py-2">
                      {a ? <ScorePill score={a.mean} /> : <Missing />}
                    </td>
                    <td className="px-4 py-2">
                      {b ? <ScorePill score={b.mean} /> : <Missing />}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {delta === null ? <Missing /> : <DeltaCell delta={delta} />}
                    </td>
                    <td className="w-64 px-4 py-2">
                      <JudgeHistogram a={a} b={b} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {judges.length > 0 && (
          <p className="border-t border-zinc-100 px-4 py-2 text-[11px] text-zinc-500">
            <span className="mr-2 inline-block h-2 w-2 bg-zinc-400" /> A · {" "}
            <span className="mr-2 inline-block h-2 w-2 bg-indigo-500" /> B · 10 buckets across [0, 1]
          </p>
        )}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <PromptDeltas
          title="Top regressions"
          tone="bad"
          matches={regressions}
          emptyText="No prompt is worse in B."
        />
        <PromptDeltas
          title="Top improvements"
          tone="good"
          matches={improvements}
          emptyText="No prompt is better in B."
        />
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white">
        <header className="border-b border-zinc-100 px-4 py-2 text-xs uppercase tracking-wide text-zinc-500">
          All matched prompts ({intersecting.length})
        </header>
        {intersecting.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">
            No prompts appear in both runs.
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Prompt</th>
                <th className="px-4 py-2 font-medium">A</th>
                <th className="px-4 py-2 font-medium">B</th>
                <th className="px-4 py-2 font-medium">Δ</th>
                <th className="px-4 py-2 font-medium">Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {intersecting.map((m, i) => (
                <tr key={i}>
                  <td className="max-w-md px-4 py-2 text-xs text-zinc-700">
                    {truncate(m.prompt, 80)}
                  </td>
                  <td className="px-4 py-2">
                    {m.meanA === null ? <Missing /> : <ScorePill score={m.meanA} />}
                  </td>
                  <td className="px-4 py-2">
                    {m.meanB === null ? <Missing /> : <ScorePill score={m.meanB} />}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    <DeltaCell delta={m.delta ?? 0} />
                  </td>
                  <td className="px-4 py-2">
                    {m.a && m.b ? (
                      <Link
                        href={`/compare/${m.a.event.id}/${m.b.event.id}`}
                        className="text-xs text-indigo-700 hover:underline"
                      >
                        open ↗
                      </Link>
                    ) : (
                      <Missing />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {matches.length > intersecting.length && (
        <p className="mt-3 text-xs text-zinc-500">
          {matches.length - intersecting.length} prompt(s) only appear in one run — omitted from the matched-prompt table.
        </p>
      )}
    </div>
  );
}

function RunMeta({
  side,
  runName,
  createdAt,
  suite,
  eventCount,
}: {
  side: string;
  runName: string;
  createdAt: string;
  suite: string | null;
  eventCount: number;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-400">
        Run {side}
      </div>
      <div className="mt-1 font-medium text-zinc-900">{runName}</div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Field label="Created" value={formatTimestamp(createdAt)} />
        <Field label="Events" value={String(eventCount)} mono />
        {suite ? <Field label="Suite" value={suite} mono /> : null}
      </dl>
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

function PromptDeltas({
  title,
  tone,
  matches,
  emptyText,
}: {
  title: string;
  tone: "good" | "bad";
  matches: ReturnType<typeof pairByPrompt>;
  emptyText: string;
}) {
  const color =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50"
      : "border-rose-200 bg-rose-50";
  return (
    <div className={`rounded-lg border ${color} p-4`}>
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-700">
        {title}
      </div>
      {matches.length === 0 ? (
        <p className="text-xs text-zinc-500">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {matches.map((m, i) => (
            <li key={i} className="text-xs text-zinc-700">
              <span className="font-mono">
                <DeltaCell delta={m.delta ?? 0} />
              </span>{" "}
              <span>{truncate(m.prompt, 90)}</span>
            </li>
          ))}
        </ul>
      )}
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

function DeltaCell({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-zinc-500">±0.00</span>;
  return (
    <span className={delta > 0 ? "text-emerald-700" : "text-rose-700"}>
      {delta > 0 ? "+" : ""}
      {delta.toFixed(2)}
    </span>
  );
}

function Missing() {
  return <span className="text-zinc-300">—</span>;
}
