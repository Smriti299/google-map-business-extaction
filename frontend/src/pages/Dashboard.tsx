import { useEffect, useMemo, useState } from "react";
import { Job, listJobs } from "../api/api";
import PageHeader from "../components/PageHeader";

function formatDateTime(value?: string) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString();
}

function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const result = await listJobs();
        const ordered = [...result].sort(
          (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
        );
        setJobs(ordered);
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, []);

  const counts = useMemo(
    () =>
      jobs.reduce(
        (acc, job) => {
          acc[job.status] = (acc[job.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    [jobs]
  );

  return (
    <section>
      <PageHeader
        eyebrow="Executive Overview"
        title="Operational visibility across your records"
        description="Track pipeline health, completion states, and audit-ready activity from a single enterprise dashboard."
        metrics={[
          { label: "Total Records", value: jobs.length },
          { label: "Pending", value: counts.pending || 0 },
          { label: "Running", value: counts.running || 0 },
          { label: "Completed", value: counts.completed || 0 },
        ]}
        actions={
          <>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Backend connected
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              Local persistence active
            </div>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_380px]">
        <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.55)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-6 py-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Activity Ledger
              </div>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Recent records</h2>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              Last 8 entries
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 px-6 py-6">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">
              No records available yet. Run a discovery request to populate the dashboard.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50/80 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Query</th>
                    <th className="px-6 py-4 font-semibold">Location</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Results</th>
                    <th className="px-6 py-4 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {jobs.slice(0, 8).map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-950">{job.request.query}</div>
                        <div className="mt-1 text-xs text-slate-500">{job.id}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {job.request.location || "No location"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{job.result_count}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDateTime(job.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.55)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Trust Building
            </div>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Operational safeguards</h2>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-950">Persistent lead workflow</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">
                  Status and notes remain saved across refreshes for each extracted business profile.
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-950">Controlled deletion</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">
                  Records require confirmation before deletion and remove associated exports together.
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-950">Traceable timestamps</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">
                  Every record keeps created and updated timing for easier audit and review.
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.9)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/70">
              Snapshot
            </div>
            <div className="mt-3 text-3xl font-semibold">{counts.completed || 0}</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">
              completed records are ready for qualification, notes, exports, and follow-up actions.
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

export default Dashboard;
