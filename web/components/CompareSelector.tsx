"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CompareSelector({
  events,
}: {
  events: { id: string; model: string; timestamp: string }[];
}) {
  const router = useRouter();
  const [a, setA] = useState<string>(events[0]?.id ?? "");
  const [b, setB] = useState<string>(events[1]?.id ?? events[0]?.id ?? "");

  if (events.length < 2) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!a || !b || a === b) return;
    router.push(`/compare/${a}/${b}`);
  };

  return (
    <form
      onSubmit={submit}
      className="mt-6 flex flex-col items-stretch gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 sm:flex-row sm:items-center"
    >
      <span className="text-xs uppercase tracking-wide text-zinc-500">
        Compare two events
      </span>
      <select
        value={a}
        onChange={(e) => setA(e.target.value)}
        className="flex-1 rounded border border-zinc-200 bg-white px-2 py-1.5 font-mono text-xs"
      >
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.id.slice(0, 8)} · {ev.model}
          </option>
        ))}
      </select>
      <span className="text-zinc-400">↔</span>
      <select
        value={b}
        onChange={(e) => setB(e.target.value)}
        className="flex-1 rounded border border-zinc-200 bg-white px-2 py-1.5 font-mono text-xs"
      >
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.id.slice(0, 8)} · {ev.model}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!a || !b || a === b}
        className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
      >
        Compare →
      </button>
    </form>
  );
}
