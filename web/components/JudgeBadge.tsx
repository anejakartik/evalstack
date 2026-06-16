import { scoreColor } from "@/lib/format";
import type { JudgeResult } from "@/lib/api";

export function JudgeBadge({ result }: { result: JudgeResult }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs ${scoreColor(
        result.score
      )}`}
      title={result.reasoning}
    >
      <span className="font-medium">{result.judge_name}</span>
      <span className="font-mono">{result.score.toFixed(2)}</span>
    </span>
  );
}
