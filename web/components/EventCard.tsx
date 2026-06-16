import type { EvalEvent, JudgeResult } from "@/lib/api";
import { formatTimestamp, shortId, truncate } from "@/lib/format";
import { JudgeBadge } from "./JudgeBadge";

export function EventCard({
  event,
  judges,
}: {
  event: EvalEvent;
  judges: JudgeResult[];
}) {
  const meanScore =
    judges.length === 0
      ? null
      : judges.reduce((s, j) => s + j.score, 0) / judges.length;

  return (
    <article className="rounded-lg border border-zinc-200 bg-white">
      <header className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono text-zinc-500">{shortId(event.id)}</span>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-zinc-700">
            {event.model}
          </span>
          <span className="text-zinc-500">
            {formatTimestamp(event.timestamp)}
          </span>
        </div>
        {meanScore !== null && (
          <span className="text-xs text-zinc-500">
            mean{" "}
            <span className="font-mono text-zinc-800">
              {meanScore.toFixed(2)}
            </span>
          </span>
        )}
      </header>
      <div className="grid grid-cols-1 gap-px bg-zinc-100 md:grid-cols-2">
        <Block label="Prompt" body={event.prompt} />
        <Block label="Completion" body={event.completion} />
      </div>
      {judges.length > 0 && (
        <div className="space-y-2 border-t border-zinc-100 px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {judges.map((j) => (
              <JudgeBadge
                key={`${j.judge_name}-${j.timestamp}`}
                result={j}
              />
            ))}
          </div>
          {judges[0].reasoning && (
            <details className="text-xs text-zinc-600">
              <summary className="cursor-pointer text-zinc-500 hover:text-zinc-900">
                Judge reasoning
              </summary>
              <ul className="mt-2 space-y-1.5">
                {judges.map((j) => (
                  <li
                    key={`reason-${j.judge_name}-${j.timestamp}`}
                    className="rounded bg-zinc-50 px-3 py-2"
                  >
                    <span className="font-medium text-zinc-700">
                      {j.judge_name}:
                    </span>{" "}
                    <span className="text-zinc-600">{j.reasoning}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </article>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <div className="mb-1.5 text-xs uppercase tracking-wide text-zinc-400">
        {label}
      </div>
      <pre className="whitespace-pre-wrap break-words font-mono text-xs text-zinc-800">
        {truncate(body, 800)}
      </pre>
    </div>
  );
}
