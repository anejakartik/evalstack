import Link from "next/link";
import { listRuns } from "@/lib/api";
import { formatTimestamp, relativeTime, shortId } from "@/lib/format";
import { RunCompareSelector } from "@/components/RunCompareSelector";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  let runs: Awaited<ReturnType<typeof listRuns>> = [];
  let error: string | null = null;
  try {
    runs = await listRuns();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Runs</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Eval runs reported by the evalstack SDK or CLI.
          </p>
        </div>
        <div className="text-xs text-zinc-500">
          Auto-refreshes every 5s
        </div>
      </div>

      {error ? (
        <ErrorPanel message={error} />
      ) : runs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Suite</th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {runs.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer hover:bg-zinc-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/runs/${r.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                    {r.suite_path ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {shortId(r.id)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    <span title={formatTimestamp(r.created_at)}>
                      {relativeTime(r.created_at)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RunCompareSelector
        runs={runs.map((r) => ({ id: r.id, name: r.name }))}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
      <h2 className="text-base font-medium text-zinc-900">No runs yet</h2>
      <p className="mt-2 text-sm text-zinc-600">
        Send your first eval run to see it here.
      </p>
      <pre className="mx-auto mt-4 inline-block rounded bg-zinc-900 px-4 py-3 text-left font-mono text-xs text-zinc-100">
        <code>{`pip install -e ./sdk
python examples/quickstart.py`}</code>
      </pre>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-6">
      <h2 className="text-sm font-semibold text-rose-900">
        Could not reach the evalstack server
      </h2>
      <p className="mt-1 text-sm text-rose-800">
        Make sure the FastAPI server is up at{" "}
        <code className="rounded bg-white px-1 font-mono">
          {process.env.EVALSTACK_API_BASE ?? "http://localhost:8000"}
        </code>
        .
      </p>
      <pre className="mt-3 overflow-x-auto rounded bg-white px-3 py-2 font-mono text-xs text-rose-900">
        {message}
      </pre>
    </div>
  );
}
