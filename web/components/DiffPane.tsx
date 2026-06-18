import { diffWords } from "@/lib/diff";

export function DiffPane({
  label,
  left,
  right,
}: {
  label: string;
  left: string;
  right: string;
}) {
  const diff = diffWords(left, right);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white">
      <header className="flex items-center justify-between border-b border-zinc-100 px-4 py-2 text-xs uppercase tracking-wide text-zinc-500">
        <span>{label}</span>
        <span className="font-mono text-zinc-700">
          <span className="text-emerald-700">+{diff.summary.added}</span>{" "}
          <span className="text-rose-700">−{diff.summary.removed}</span>{" "}
          <span className="text-zinc-400">·{diff.summary.kept}</span>
        </span>
      </header>
      <div className="grid grid-cols-1 gap-px bg-zinc-100 md:grid-cols-2">
        <Side title="A" segments={diff.left} variant="left" />
        <Side title="B" segments={diff.right} variant="right" />
      </div>
    </section>
  );
}

function Side({
  title,
  segments,
  variant,
}: {
  title: string;
  segments: { value: string; kind: "same" | "left" | "right" }[];
  variant: "left" | "right";
}) {
  return (
    <div className="bg-white px-4 py-3">
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
        {title}
      </div>
      <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-zinc-800">
        {segments.length === 0 ? (
          <span className="text-zinc-400">∅</span>
        ) : (
          segments.map((s, i) => {
            if (s.kind === "same") return <span key={i}>{s.value}</span>;
            if (s.kind === variant) {
              const color =
                variant === "left"
                  ? "bg-rose-100 text-rose-900"
                  : "bg-emerald-100 text-emerald-900";
              return (
                <span key={i} className={color}>
                  {s.value}
                </span>
              );
            }
            return null;
          })
        )}
      </pre>
    </div>
  );
}
