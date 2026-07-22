import { useState } from "react";
import { startJob } from "../api/api";
import PageHeader from "../components/PageHeader";

function SearchPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [limit, setLimit] = useState(20);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = { query, location: location || undefined, limit };
      const job = await startJob(payload);
      setJobId(job.id);
    } catch {
      setError("Unable to start the request. Please check your backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl">
      <PageHeader
        eyebrow="Discovery Control"
        title="Launch a new business discovery request"
        description="Run structured searches with controlled location and volume settings, then qualify the resulting leads inside the workspace."
        metrics={[
          { label: "Source", value: "Google Maps" },
          { label: "Mode", value: "Structured request" },
          { label: "Persistence", value: "Enabled" },
          { label: "Lead Workflow", value: "Status + Notes" },
        ]}
        actions={
          <>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              Controlled inputs
            </div>
            <div className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Sticky action zone
            </div>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px] 2xl:grid-cols-[minmax(0,1.4fr)_420px]">
        <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.55)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Sticky Top Action Bar
              </div>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Search configuration</h2>
            </div>
            <button
              type="submit"
              form="search-form"
              disabled={loading}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Running..." : "Run Search"}
            </button>
          </div>

          <form id="search-form" onSubmit={handleSubmit} className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-slate-800">Search query</label>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. dentist"
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-950"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800">Target location</label>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="e.g. Delhi, India"
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-950"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800">Record limit</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-950"
                required
              />
            </div>
          </form>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {jobId ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
              <div className="font-semibold">Request created successfully</div>
              <div className="mt-1 break-all">Record ID: {jobId}</div>
            </div>
          ) : null}
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.55)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Professional Polish
            </div>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Quality controls</h2>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-950">Stable request shape</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">
                  Keep searches consistent with controlled query, location, and volume inputs.
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-950">Review-ready output</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">
                  Every completed request flows into tables, notes, statuses, and export workflows.
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.9)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/70">
              Trust Building
            </div>
            <div className="mt-3 text-lg font-semibold">Requests create auditable records</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">
              Every run becomes a traceable record with timestamps, status state, and persistent lead annotations.
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

export default SearchPage;
