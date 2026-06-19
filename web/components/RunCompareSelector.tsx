"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RunCompareSelector({
  runs,
}: {
  runs: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [a, setA] = useState<string>(runs[0]?.id ?? "");
  const [b, setB] = useState<string>(runs[1]?.id ?? runs[0]?.id ?? "");

  if (runs.length < 2) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!a || !b || a === b) return;
    router.push(`/compare/runs/${a}/${b}`);
  };

  return (
    <form
      onSubmit={submit}
      className="mt-6 flex flex-col items-stretch gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 sm:flex-row sm:items-center"
    >
      <span className="text-xs uppercase tracking-wide text-zinc-500">
        Compare two runs
      </span>
      <select
        value={a}
        onChange={(e) => setA(e.target.value)}
        className="flex-1 rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs"
      >
        {runs.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <span className="text-zinc-400">↔</span>
      <select
        value={b}
        onChange={(e) => setB(e.target.value)}
        className="flex-1 rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs"
      >
        {runs.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!a || !b || a === b}
        className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
      >
        Compare runs →
      </button>
    </form>
  );
}
