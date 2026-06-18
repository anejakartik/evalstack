// Tiny word-level LCS diff for prompts/completions.
// Returns segments tagged as same / left / right.

type Token = { value: string; kind: "word" | "space" };

function tokenize(s: string): Token[] {
  const tokens: Token[] = [];
  const re = /\s+|[^\s]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    tokens.push({
      value: m[0],
      kind: /^\s+$/.test(m[0]) ? "space" : "word",
    });
  }
  return tokens;
}

export type DiffSegment = { value: string; kind: "same" | "left" | "right" };

function lcs(a: Token[], b: Token[]): number[][] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1].value === b[j - 1].value) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

export function diffWords(left: string, right: string): {
  left: DiffSegment[];
  right: DiffSegment[];
  summary: { added: number; removed: number; kept: number };
} {
  const A = tokenize(left ?? "");
  const B = tokenize(right ?? "");
  const dp = lcs(A, B);

  const leftOut: DiffSegment[] = [];
  const rightOut: DiffSegment[] = [];
  let added = 0;
  let removed = 0;
  let kept = 0;

  let i = A.length;
  let j = B.length;
  const leftRev: DiffSegment[] = [];
  const rightRev: DiffSegment[] = [];
  while (i > 0 && j > 0) {
    if (A[i - 1].value === B[j - 1].value) {
      leftRev.push({ value: A[i - 1].value, kind: "same" });
      rightRev.push({ value: B[j - 1].value, kind: "same" });
      if (A[i - 1].kind === "word") kept++;
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      leftRev.push({ value: A[i - 1].value, kind: "left" });
      if (A[i - 1].kind === "word") removed++;
      i--;
    } else {
      rightRev.push({ value: B[j - 1].value, kind: "right" });
      if (B[j - 1].kind === "word") added++;
      j--;
    }
  }
  while (i > 0) {
    leftRev.push({ value: A[i - 1].value, kind: "left" });
    if (A[i - 1].kind === "word") removed++;
    i--;
  }
  while (j > 0) {
    rightRev.push({ value: B[j - 1].value, kind: "right" });
    if (B[j - 1].kind === "word") added++;
    j--;
  }
  leftOut.push(...leftRev.reverse());
  rightOut.push(...rightRev.reverse());

  return { left: leftOut, right: rightOut, summary: { added, removed, kept } };
}
