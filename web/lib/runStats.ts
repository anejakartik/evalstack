// Aggregations for the run-level diff view.

import type { EvalEvent, JudgeResult } from "@/lib/api";

export type RunBundle = {
  events: EvalEvent[];
  judgesByEvent: Map<string, JudgeResult[]>;
};

export type JudgeStats = {
  judge: string;
  count: number;
  mean: number;
  min: number;
  max: number;
  distribution: number[]; // length = N_BUCKETS
};

export const N_BUCKETS = 10;

export function judgeStats(bundle: RunBundle): JudgeStats[] {
  const byJudge: Map<string, number[]> = new Map();
  for (const ev of bundle.events) {
    const judges = bundle.judgesByEvent.get(ev.id) ?? [];
    for (const j of judges) {
      const arr = byJudge.get(j.judge_name) ?? [];
      arr.push(j.score);
      byJudge.set(j.judge_name, arr);
    }
  }
  const out: JudgeStats[] = [];
  for (const [judge, scores] of Array.from(byJudge.entries()).sort()) {
    if (scores.length === 0) continue;
    const mean = scores.reduce((s, n) => s + n, 0) / scores.length;
    out.push({
      judge,
      count: scores.length,
      mean,
      min: Math.min(...scores),
      max: Math.max(...scores),
      distribution: bucketize(scores, N_BUCKETS),
    });
  }
  return out;
}

function bucketize(values: number[], n: number): number[] {
  const buckets = new Array(n).fill(0);
  for (const v of values) {
    const idx = Math.min(n - 1, Math.max(0, Math.floor(v * n)));
    buckets[idx] += 1;
  }
  return buckets;
}

export type PromptMatch = {
  prompt: string;
  a?: { event: EvalEvent; judges: JudgeResult[] };
  b?: { event: EvalEvent; judges: JudgeResult[] };
  /** mean score across all judges for each side */
  meanA: number | null;
  meanB: number | null;
  /** delta = meanB - meanA, null if either side missing */
  delta: number | null;
};

export function pairByPrompt(a: RunBundle, b: RunBundle): PromptMatch[] {
  const aByPrompt = new Map<string, { event: EvalEvent; judges: JudgeResult[] }>();
  for (const ev of a.events) {
    aByPrompt.set(ev.prompt, { event: ev, judges: a.judgesByEvent.get(ev.id) ?? [] });
  }
  const bByPrompt = new Map<string, { event: EvalEvent; judges: JudgeResult[] }>();
  for (const ev of b.events) {
    bByPrompt.set(ev.prompt, { event: ev, judges: b.judgesByEvent.get(ev.id) ?? [] });
  }
  const allPrompts = new Set<string>([...aByPrompt.keys(), ...bByPrompt.keys()]);
  const matches: PromptMatch[] = [];
  for (const prompt of allPrompts) {
    const av = aByPrompt.get(prompt);
    const bv = bByPrompt.get(prompt);
    const meanA = av && av.judges.length > 0 ? avg(av.judges.map((j) => j.score)) : null;
    const meanB = bv && bv.judges.length > 0 ? avg(bv.judges.map((j) => j.score)) : null;
    const delta = meanA !== null && meanB !== null ? meanB - meanA : null;
    matches.push({ prompt, a: av, b: bv, meanA, meanB, delta });
  }
  // Sort: biggest regression first, then biggest improvement, then ties.
  matches.sort((x, y) => {
    const dx = x.delta ?? 0;
    const dy = y.delta ?? 0;
    return Math.abs(dy) - Math.abs(dx);
  });
  return matches;
}

function avg(xs: number[]): number {
  return xs.reduce((s, n) => s + n, 0) / xs.length;
}
