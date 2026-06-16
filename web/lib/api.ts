// Server-side fetch helpers for the evalstack FastAPI backend.

const API_BASE =
  process.env.EVALSTACK_API_BASE ?? "http://localhost:8000";

const REVALIDATE_SECONDS = 5;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new Error(`evalstack API ${res.status} on ${path}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export type Run = {
  id: string;
  name: string;
  created_at: string;
  suite_path: string | null;
};

export type EvalEvent = {
  id: string;
  run_id: string | null;
  timestamp: string;
  model: string;
  prompt: string;
  completion: string;
  metadata: Record<string, unknown>;
};

export type JudgeResult = {
  event_id: string;
  judge_name: string;
  score: number;
  reasoning: string;
  timestamp: string;
};

export async function listRuns(limit = 50): Promise<Run[]> {
  return get<Run[]>(`/runs?limit=${limit}`);
}

export async function getRun(id: string): Promise<Run> {
  return get<Run>(`/runs/${id}`);
}

export async function listEvents(runId?: string, limit = 200): Promise<EvalEvent[]> {
  const qs = new URLSearchParams();
  if (runId) qs.set("run_id", runId);
  qs.set("limit", String(limit));
  return get<EvalEvent[]>(`/events?${qs}`);
}

export async function listJudgeResults(eventId: string): Promise<JudgeResult[]> {
  return get<JudgeResult[]>(`/judge-results?event_id=${eventId}`);
}

export function apiBase(): string {
  return API_BASE;
}
