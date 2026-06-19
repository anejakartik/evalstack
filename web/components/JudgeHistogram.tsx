import { N_BUCKETS, type JudgeStats } from "@/lib/runStats";

export function JudgeHistogram({
  a,
  b,
}: {
  a: JudgeStats | undefined;
  b: JudgeStats | undefined;
}) {
  // Combine bucket counts so the bar chart axis is shared.
  const aDist = a?.distribution ?? new Array(N_BUCKETS).fill(0);
  const bDist = b?.distribution ?? new Array(N_BUCKETS).fill(0);
  const maxBucket = Math.max(...aDist, ...bDist, 1);

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-10 gap-px">
        {Array.from({ length: N_BUCKETS }, (_, i) => {
          const aCount = aDist[i];
          const bCount = bDist[i];
          const aHeight = (aCount / maxBucket) * 100;
          const bHeight = (bCount / maxBucket) * 100;
          return (
            <div
              key={i}
              className="relative h-14 bg-zinc-50 border border-zinc-100"
              title={`bucket ${(i / N_BUCKETS).toFixed(1)}–${(
                (i + 1) /
                N_BUCKETS
              ).toFixed(1)} · A=${aCount} · B=${bCount}`}
            >
              <div
                className="absolute bottom-0 left-0 w-1/2 bg-zinc-400"
                style={{ height: `${aHeight}%` }}
              />
              <div
                className="absolute bottom-0 right-0 w-1/2 bg-indigo-500"
                style={{ height: `${bHeight}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] font-mono text-zinc-400">
        <span>0.0</span>
        <span>0.5</span>
        <span>1.0</span>
      </div>
    </div>
  );
}
