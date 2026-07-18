import { useEffect, useState } from "react";
import { Job, createExport, downloadExport, listJobs } from "../api/api";
import PageHeader from "../components/PageHeader";

function ExportsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [exportFormat, setExportFormat] = useState("csv");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadJobs() {
      const result = await listJobs();
      const completed = result
        .filter((job) => job.status === "completed")
        .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
      setJobs(completed);
    }

    loadJobs();
  }, []);

  async function handleExport() {
    if (!selectedJobId) {
      setMessage("Please select a record first.");
      return;
    }

    setMessage("Preparing export...");
    try {
      await createExport(selectedJobId, exportFormat);
      downloadExport(selectedJobId, exportFormat);
      setMessage("Export ready. Download should begin shortly.");
    } catch {
      setMessage("Export failed. Verify record status and try again.");
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow="Export Center"
        title="Controlled exports for saved records"
        description="Generate structured files from completed records with a professional export flow that stays audit-friendly and predictable."
        metrics={[
          { label: "Completed Records", value: jobs.length },
          { label: "Formats", value: 3 },
          { label: "Delivery", value: "Direct download" },
          { label: "Trust", value: "Controlled" },
        ]}
        actions={
          <>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              CSV / XLSX / JSON
            </div>
            <div className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Export safeguards
            </div>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_380px]">
        <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.55)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-6 py-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Sticky Top Action Bar
              </div>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Completed records</h2>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Export and download
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">
              No completed records are ready for export yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50/80 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Query</th>
                    <th className="px-6 py-4 font-semibold">Location</th>
                    <th className="px-6 py-4 font-semibold">Results</th>
                    <th className="px-6 py-4 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={`cursor-pointer transition hover:bg-slate-50/80 ${
                        selectedJobId === job.id ? "bg-slate-50/90" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-950">{job.request.query}</div>
                        <div className="mt-1 text-xs text-slate-500">{job.id}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {job.request.location || "No location"}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{job.result_count}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(job.created_at).toLocaleString()}
                      </td>
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
              Export Options
            </div>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Format control</h2>
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800">Output format</label>
                <select
                  value={exportFormat}
                  onChange={(event) => setExportFormat(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950"
                >
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              {message ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  {message}
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.9)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/70">
              Trust Building
            </div>
            <div className="mt-3 text-lg font-semibold">Export only from completed records</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">
              The export flow only surfaces completed records, reducing accidental download attempts and invalid files.
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

export default ExportsPage;
