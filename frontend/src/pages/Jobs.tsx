import { useEffect, useMemo, useState } from "react";
import { deleteJob, getJob, Job, listJobs } from "../api/api";
import PageHeader from "../components/PageHeader";

const statusTone: Record<string, string> = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  running: "border-amber-200 bg-amber-50 text-amber-700",
  pending: "border-slate-200 bg-slate-100 text-slate-600",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
};

function formatDateTime(value?: string) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString();
}

function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState<Job | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const items = await listJobs();
        const orderedJobs = [...items].sort(
          (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
        );
        setJobs(orderedJobs);
      } catch {
        setError("Unable to load records.");
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

  async function handleSelect(jobId: string) {
    setError(null);
    setSelectedJobId(jobId);

    try {
      const job = await getJob(jobId);
      setJobDetails(job);
    } catch {
      setJobDetails(null);
      setError("Unable to load record details.");
    }
  }

  async function handleDelete(job: Job) {
    const shouldDelete = window.confirm(
      `Delete record "${job.request.query}"? This will remove its saved results and exports too.`
    );
    if (!shouldDelete) {
      return;
    }

    setDeletingJobId(job.id);
    setError(null);
    try {
      await deleteJob(job.id);
      setJobs((currentJobs) => currentJobs.filter((item) => item.id !== job.id));
      if (selectedJobId === job.id) {
        setSelectedJobId(null);
        setJobDetails(null);
      }
    } catch {
      setError("Unable to delete the selected record.");
    } finally {
      setDeletingJobId(null);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl">
      <PageHeader
        eyebrow="Record Ledger"
        title="Structured records with operational controls"
        description="Review every saved request in a professional table view, inspect metadata, and apply controlled delete actions."
        metrics={[
          { label: "Total Records", value: jobs.length },
          { label: "Completed", value: counts.completed || 0 },
          { label: "Running", value: counts.running || 0 },
          { label: "Failed", value: counts.failed || 0 },
        ]}
        actions={
          <>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              Table view
            </div>
            <div className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
              Confirmed delete flow
            </div>
          </>
        }
      />

      {error ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_380px] 2xl:grid-cols-[minmax(0,1.7fr)_420px]">
        <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.55)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-6 py-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Sticky Top Action Bar
              </div>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">All records</h2>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {jobs.length} rows
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 px-6 py-6">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">
              No records yet. Start a discovery request to populate this ledger.
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
                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {jobs.map((job) => {
                    const isDeleting = deletingJobId === job.id;
                    const isSelected = selectedJobId === job.id;

                    return (
                      <tr
                        key={job.id}
                        className={`transition hover:bg-slate-50/80 ${isSelected ? "bg-slate-50/90" : ""}`}
                      >
                        <td className="px-6 py-4">
                          <button onClick={() => handleSelect(job.id)} className="min-w-0 text-left">
                            <div className="font-medium text-slate-950">{job.request.query}</div>
                            <div className="mt-1 text-xs text-slate-500">{job.id}</div>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {job.request.location || "No location"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                              statusTone[job.status] || statusTone.pending
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{job.result_count}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDateTime(job.created_at)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(job)}
                            disabled={isDeleting}
                            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDeleting ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.55)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Details Panel
            </div>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              {jobDetails ? "Selected record" : "No record selected"}
            </h2>

            {!selectedJobId ? (
              <div className="mt-5 text-sm leading-6 text-slate-500">
                Select a row from the table to inspect its request metadata and status history.
              </div>
            ) : jobDetails ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Record ID
                  </div>
                  <div className="mt-2 break-all text-sm font-medium text-slate-950">{jobDetails.id}</div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Query
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-950">{jobDetails.request.query}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Location
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-950">
                      {jobDetails.request.location || "No location"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Status
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-950">{jobDetails.status}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Results
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-950">{jobDetails.result_count}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Created
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-950">
                    {formatDateTime(jobDetails.created_at)}
                  </div>
                </div>

                {jobDetails.updated_at ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Last Updated
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-950">
                      {formatDateTime(jobDetails.updated_at)}
                    </div>
                  </div>
                ) : null}

                {jobDetails.error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                    <div className="font-semibold text-rose-800">Failure reason</div>
                    <div className="mt-1">{jobDetails.error}</div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-5 text-sm leading-6 text-slate-500">Loading selected record...</div>
            )}
          </section>

          <section className="rounded-[28px] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.9)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/70">
              Trust Building
            </div>
            <div className="mt-3 text-lg font-semibold">Auditable delete workflow</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">
              Every deletion is user-confirmed and cleans up dependent results and export artifacts.
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

export default JobsPage;
