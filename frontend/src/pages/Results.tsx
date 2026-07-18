import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getResults, Job, listJobs, updateRecord } from "../api/api";
import PageHeader from "../components/PageHeader";

type BusinessProfile = {
  record_id?: string;
  name?: string;
  category?: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number | string;
  reviews?: number | string;
  maps_url?: string;
  latitude?: number | string;
  longitude?: number | string;
  lead_status?: string;
  notes?: string;
};

const jobStatusTone: Record<string, string> = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  running: "border-amber-200 bg-amber-50 text-amber-700",
  pending: "border-slate-200 bg-slate-100 text-slate-600",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
};

const leadStatusOptions = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up", label: "Follow-up" },
  { value: "qualified", label: "Qualified" },
  { value: "rejected", label: "Rejected" },
];

const editableLeadStatuses = leadStatusOptions.filter((option) => option.value !== "all");

const leadStatusTone: Record<string, string> = {
  new: "border-sky-200 bg-sky-50 text-sky-700",
  contacted: "border-violet-200 bg-violet-50 text-violet-700",
  follow_up: "border-amber-200 bg-amber-50 text-amber-700",
  qualified: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

function normalizeProfile(profile: Record<string, unknown>): BusinessProfile {
  return {
    record_id: typeof profile.record_id === "string" ? profile.record_id : undefined,
    name: typeof profile.name === "string" ? profile.name : undefined,
    category: typeof profile.category === "string" ? profile.category : undefined,
    address: typeof profile.address === "string" ? profile.address : undefined,
    phone: typeof profile.phone === "string" ? profile.phone : undefined,
    website: typeof profile.website === "string" ? profile.website : undefined,
    rating:
      typeof profile.rating === "number" || typeof profile.rating === "string"
        ? profile.rating
        : undefined,
    reviews:
      typeof profile.reviews === "number" || typeof profile.reviews === "string"
        ? profile.reviews
        : undefined,
    maps_url: typeof profile.maps_url === "string" ? profile.maps_url : undefined,
    latitude:
      typeof profile.latitude === "number" || typeof profile.latitude === "string"
        ? profile.latitude
        : undefined,
    longitude:
      typeof profile.longitude === "number" || typeof profile.longitude === "string"
        ? profile.longitude
        : undefined,
    lead_status: typeof profile.lead_status === "string" ? profile.lead_status : "new",
    notes: typeof profile.notes === "string" ? profile.notes : "",
  };
}

function formatNumber(value?: number | string) {
  if (value === undefined || value === null || value === "") {
    return "N/A";
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-IN").format(numericValue);
}

function formatCompactNumber(value?: number | string) {
  if (value === undefined || value === null || value === "") {
    return "0";
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(numericValue);
}

function formatRating(value?: number | string) {
  if (value === undefined || value === null || value === "") {
    return "N/A";
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return numericValue.toFixed(1);
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString();
}

function normalizeHref(value?: string) {
  if (!value) {
    return undefined;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

function formatLeadStatus(value?: string) {
  return (value || "new").replace(/_/g, " ");
}

function getTrustProfile(profile?: BusinessProfile | null) {
  if (!profile) {
    return {
      label: "Awaiting review",
      tone: "border-slate-200 bg-slate-50 text-slate-700",
      score: 0,
    };
  }

  const rating = Number(profile.rating);
  const reviews = Number(profile.reviews);
  let score = 0;

  if (!Number.isNaN(rating)) {
    score += Math.min(50, Math.round((rating / 5) * 50));
  }

  if (!Number.isNaN(reviews)) {
    score += Math.min(35, Math.round(Math.log10(reviews + 1) * 12));
  }

  if (profile.website) {
    score += 8;
  }

  if (profile.phone) {
    score += 7;
  }

  if (score >= 75) {
    return {
      label: "High confidence lead",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      score,
    };
  }

  if (score >= 45) {
    return {
      label: "Promising profile",
      tone: "border-cyan-200 bg-cyan-50 text-cyan-700",
      score,
    };
  }

  return {
    label: "Needs manual validation",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
    score,
  };
}

function getReviewInsight(profile?: BusinessProfile | null) {
  if (!profile) {
    return "Select a profile to inspect customer sentiment strength.";
  }

  const rating = Number(profile.rating);
  const reviews = Number(profile.reviews);

  if (!Number.isNaN(rating) && !Number.isNaN(reviews) && rating >= 4.4 && reviews >= 1000) {
    return "Strong social proof with high rating consistency and heavy review volume.";
  }

  if (!Number.isNaN(rating) && rating >= 4) {
    return "Healthy rating signal. Review quality looks commercially usable.";
  }

  if (!Number.isNaN(reviews) && reviews >= 100) {
    return "Decent review depth, but needs closer qualification before outreach.";
  }

  return "Limited review proof. Validate business quality with website and direct contact.";
}

function ResultsPage() {
  const { jobId: routeJobId } = useParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string>("");
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [savingRecordId, setSavingRecordId] = useState("");
  const [draftStatuses, setDraftStatuses] = useState<Record<string, string>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const data = await listJobs();
        const orderedJobs = [...data].sort(
          (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
        );
        setJobs(orderedJobs);
      } finally {
        setLoadingJobs(false);
      }
    }

    fetchJobs();
  }, []);

  useEffect(() => {
    if (!routeJobId || loadingJobs || selectedJobId === routeJobId) {
      return;
    }
    void handleSelectJob(routeJobId);
  }, [routeJobId, loadingJobs, selectedJobId, jobs]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId]
  );

  const profiles = useMemo(() => results.map(normalizeProfile), [results]);

  useEffect(() => {
    const nextStatuses: Record<string, string> = {};
    const nextNotes: Record<string, string> = {};

    profiles.forEach((profile) => {
      if (!profile.record_id) {
        return;
      }
      nextStatuses[profile.record_id] = profile.lead_status || "new";
      nextNotes[profile.record_id] = profile.notes || "";
    });

    setDraftStatuses(nextStatuses);
    setDraftNotes(nextNotes);
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const statusValue = draftStatuses[profile.record_id || ""] || profile.lead_status || "new";
      const matchesStatus = filterStatus === "all" || statusValue === filterStatus;

      const haystack = [
        profile.name,
        profile.category,
        profile.address,
        profile.phone,
        profile.website,
        draftNotes[profile.record_id || ""] || profile.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !searchTerm || haystack.includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [profiles, filterStatus, searchTerm, draftNotes, draftStatuses]);

  const selectedProfile = useMemo(
    () =>
      filteredProfiles.find((profile) => profile.record_id === selectedRecordId) ??
      filteredProfiles[0] ??
      null,
    [filteredProfiles, selectedRecordId]
  );

  useEffect(() => {
    if (selectedProfile?.record_id) {
      setSelectedRecordId(selectedProfile.record_id);
      return;
    }
    setSelectedRecordId("");
  }, [selectedProfile?.record_id]);

  const qualifiedCount = useMemo(
    () =>
      profiles.filter(
        (profile) => (draftStatuses[profile.record_id || ""] || profile.lead_status) === "qualified"
      ).length,
    [profiles, draftStatuses]
  );

  const followUpCount = useMemo(
    () =>
      profiles.filter(
        (profile) => (draftStatuses[profile.record_id || ""] || profile.lead_status) === "follow_up"
      ).length,
    [profiles, draftStatuses]
  );

  const averageRating = useMemo(() => {
    const ratedProfiles = profiles.filter((profile) => !Number.isNaN(Number(profile.rating)));
    if (ratedProfiles.length === 0) {
      return "N/A";
    }

    const total = ratedProfiles.reduce((sum, profile) => sum + Number(profile.rating), 0);
    return (total / ratedProfiles.length).toFixed(1);
  }, [profiles]);

  const selectedTrust = useMemo(() => getTrustProfile(selectedProfile), [selectedProfile]);
  const reviewInsight = useMemo(() => getReviewInsight(selectedProfile), [selectedProfile]);

  async function handleSelectJob(jobId: string) {
    const job = jobs.find((item) => item.id === jobId);
    setSelectedJobId(jobId);
    setResults([]);
    setSelectedRecordId("");
    setError(null);

    if (!job) {
      setError("Unable to find the selected record.");
      return;
    }

    if (job.status === "failed") {
      setError(`Record failed: ${job.error ?? "No details available."}`);
      return;
    }

    if (job.status !== "completed") {
      setError(`Record is not completed yet. Current status: ${job.status}.`);
      return;
    }

    setLoadingResults(true);
    try {
      const data = await getResults(jobId);
      setResults(data);
      if (data.length === 0) {
        setError("This completed record returned no profiles.");
      }
    } catch {
      setError("Unable to load results for this record.");
      setResults([]);
    } finally {
      setLoadingResults(false);
    }
  }

  async function handleSaveRecord(recordId: string) {
    if (!selectedJobId) {
      return;
    }

    setSavingRecordId(recordId);
    setError(null);
    try {
      const updated = await updateRecord(selectedJobId, recordId, {
        lead_status: draftStatuses[recordId] || "new",
        notes: draftNotes[recordId] || "",
      });

      setResults((currentResults) =>
        currentResults.map((result) =>
          String(result.record_id ?? "") === recordId
            ? {
                ...result,
                lead_status: updated.lead_status,
                notes: updated.notes,
              }
            : result
        )
      );
    } catch {
      setError("Unable to save record updates.");
    } finally {
      setSavingRecordId("");
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow="Lead Review Workspace"
        title="Professional result review with richer business details"
        description="Scan extracted businesses in a cleaner operations layout, review rating and trust signals, and keep notes visible while qualifying each lead."
        metrics={[
          { label: "Saved Records", value: jobs.length },
          { label: "Profiles", value: profiles.length },
          { label: "Average Rating", value: averageRating },
          { label: "Qualified", value: qualifiedCount },
        ]}
        actions={
          <>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              Better profile visibility
            </div>
            <div className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Stronger details panel
            </div>
          </>
        }
      />

      {error ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)] min-[1850px]:grid-cols-[300px_minmax(0,1fr)_420px]">
        <aside className="rounded-[30px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.7)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Saved search sets
              </div>
              <h2 className="mt-2 text-[1.35rem] font-semibold tracking-tight text-slate-950">
                Result collections
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Pick a completed search to load its extracted business profiles.
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {jobs.length} total
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {loadingJobs ? (
              [...Array(5)].map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-[26px] bg-slate-100" />
              ))
            ) : jobs.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No saved records available yet.
              </div>
            ) : (
              jobs.map((job) => {
                const isActive = job.id === selectedJobId;

                return (
                  <button
                    key={job.id}
                    onClick={() => handleSelectJob(job.id)}
                    className={`w-full rounded-[28px] border p-4 text-left transition ${
                      isActive
                        ? "border-slate-950 bg-slate-950 text-white shadow-[0_28px_70px_-38px_rgba(15,23,42,0.95)]"
                        : "border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] hover:border-slate-300 hover:shadow-[0_18px_40px_-34px_rgba(15,23,42,0.5)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className={`truncate text-base font-semibold ${isActive ? "text-white" : "text-slate-950"}`}>
                          {job.request.query}
                        </div>
                        <div className={`mt-1 text-sm ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                          {job.request.location || "No location filter"}
                        </div>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          isActive
                            ? "border-white/15 bg-white/10 text-cyan-100"
                            : jobStatusTone[job.status] || jobStatusTone.pending
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <div className={`mt-4 grid grid-cols-2 gap-3 rounded-2xl p-3 ${isActive ? "bg-white/5" : "bg-slate-50"}`}>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Profiles</div>
                        <div className={`mt-1 text-lg font-semibold ${isActive ? "text-white" : "text-slate-950"}`}>
                          {job.result_count}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Created</div>
                        <div className={`mt-1 text-sm font-medium ${isActive ? "text-slate-100" : "text-slate-700"}`}>
                          {formatDateTime(job.created_at)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/95 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.7)]">
            <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.97))] px-6 py-6">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Review workspace
                    </div>
                    <h2 className="mt-2 text-[1.55rem] font-semibold tracking-tight text-slate-950">
                      Business results overview
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Review extracted businesses in a stable table layout with clear filters and structured detail cards.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search business, address, note, phone..."
                      className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:bg-white"
                    />
                    <select
                      value={filterStatus}
                      onChange={(event) => setFilterStatus(event.target.value)}
                      className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:bg-white"
                    >
                      {leadStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Active search
                    </div>
                    <div className="mt-2 truncate text-base font-semibold text-slate-950">
                      {selectedJob?.request.query || "Select a record"}
                    </div>
                    <div className="mt-1 truncate text-sm text-slate-500">
                      {selectedJob?.request.location || "Location will appear here"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Visible profiles
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      {filteredProfiles.length}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      from {profiles.length} extracted results
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Follow-up ready
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{followUpCount}</div>
                    <div className="mt-1 text-sm text-slate-500">saved for outreach or qualification</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Average rating
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{averageRating}</div>
                    <div className="mt-1 text-sm text-slate-500">aggregate public rating signal</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/95 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.7)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-6 py-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Profile table
                </div>
                <div className="mt-1 text-base font-semibold text-slate-950">
                  Clean operational view
                </div>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                {filteredProfiles.length} rows
              </div>
            </div>

            {loadingResults ? (
              <div className="space-y-3 px-6 py-6">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="px-6 py-12 text-sm text-slate-500">
                No profiles match the current filters. Select a completed record or refine the search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50/85 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Business</th>
                      <th className="px-6 py-4 font-semibold">Address</th>
                      <th className="px-6 py-4 font-semibold">Social proof</th>
                      <th className="px-6 py-4 font-semibold">Lead status</th>
                      <th className="px-6 py-4 font-semibold">Qualification notes</th>
                      <th className="px-6 py-4 font-semibold text-right">Save</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80">
                    {filteredProfiles.map((profile) => {
                      const recordId = profile.record_id || "";
                      const currentStatus = draftStatuses[recordId] || profile.lead_status || "new";
                      const currentNotes = draftNotes[recordId] || profile.notes || "";
                      const isSaving = savingRecordId === recordId;
                      const isSelected = selectedRecordId === recordId;

                      return (
                        <tr
                          key={recordId || profile.name}
                          className={`cursor-pointer align-top transition ${
                            isSelected
                              ? "bg-cyan-50/50 shadow-[inset_3px_0_0_0_rgba(14,165,233,0.9)]"
                              : "hover:bg-slate-50/80"
                          }`}
                          onClick={() => setSelectedRecordId(recordId)}
                        >
                          <td className="px-6 py-5 align-top">
                            <div className="max-w-[280px]">
                              <div className="text-[1rem] font-semibold leading-7 text-slate-950">
                                {profile.name || "Untitled business"}
                              </div>
                              <div className="mt-1 text-sm text-slate-500">
                                {profile.category || "Uncategorized"}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {profile.phone ? (
                                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                                    {profile.phone}
                                  </span>
                                ) : null}
                                {profile.website ? (
                                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                                    Website available
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="max-w-[280px] px-6 py-5 align-top">
                            <div className="text-sm leading-7 text-slate-700">
                              {profile.address || "No address available"}
                            </div>
                          </td>
                          <td className="px-6 py-5 align-top">
                            <div className="min-w-[190px] rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="flex items-center gap-2">
                                <div className="text-2xl font-semibold text-slate-950">
                                  {formatRating(profile.rating)}
                                </div>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-500">
                                  Rating
                                </div>
                              </div>
                              <div className="mt-2 text-sm text-slate-600">
                                {formatNumber(profile.reviews)} reviews
                              </div>
                              <div className="mt-3 h-2 rounded-full bg-slate-100">
                                <div
                                  className="h-2 rounded-full bg-[linear-gradient(90deg,#0ea5e9,#22c55e)]"
                                  style={{
                                    width: `${Math.min(100, Math.max(10, (Number(profile.rating) || 0) * 20))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 align-top">
                            <select
                              value={currentStatus}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) =>
                                setDraftStatuses((current) => ({
                                  ...current,
                                  [recordId]: event.target.value,
                                }))
                              }
                              disabled={!recordId}
                              className="w-full min-w-[170px] rounded-2xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {editableLeadStatuses.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="min-w-[300px] px-6 py-5 align-top">
                            <textarea
                              value={currentNotes}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) =>
                                setDraftNotes((current) => ({
                                  ...current,
                                  [recordId]: event.target.value,
                                }))
                              }
                              placeholder="Add qualification notes, call outcome, owner info, follow-up plan..."
                              rows={4}
                              className="w-full resize-none rounded-2xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:bg-white"
                            />
                          </td>
                          <td className="px-6 py-5 align-top text-right">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleSaveRecord(recordId);
                              }}
                              disabled={!recordId || isSaving}
                              className="rounded-full bg-slate-950 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isSaving ? "Saving..." : "Save"}
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
        </div>

        <aside className="space-y-6 xl:col-span-2 min-[1850px]:col-span-1">
          <section className="rounded-[30px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.7)] min-[1850px]:sticky min-[1850px]:top-[112px]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Business detail panel
            </div>

            {selectedProfile ? (
              <div className="mt-4 space-y-5">
                <div className="rounded-[26px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,#ffffff,#f8fafc)] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                        {selectedProfile.name || "Selected profile"}
                      </h2>
                      <div className="mt-2 text-sm text-slate-500">
                        {selectedProfile.category || "Business category not available"}
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                        selectedTrust.tone
                      }`}
                    >
                      {selectedTrust.score}/100
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                        leadStatusTone[
                          draftStatuses[selectedProfile.record_id || ""] ||
                            selectedProfile.lead_status ||
                            "new"
                        ] || leadStatusTone.new
                      }`}
                    >
                      {formatLeadStatus(
                        draftStatuses[selectedProfile.record_id || ""] ||
                          selectedProfile.lead_status ||
                          "new"
                      )}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      {formatNumber(selectedProfile.reviews)} reviews
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      {formatRating(selectedProfile.rating)} rating
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <a
                      href={selectedProfile.phone ? `tel:${selectedProfile.phone}` : undefined}
                      className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                        selectedProfile.phone
                          ? "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                          : "pointer-events-none border-slate-200 bg-slate-50 text-slate-400"
                      }`}
                    >
                      Call business
                    </a>
                    <a
                      href={normalizeHref(selectedProfile.website)}
                      target="_blank"
                      rel="noreferrer"
                      className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                        selectedProfile.website
                          ? "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                          : "pointer-events-none border-slate-200 bg-slate-50 text-slate-400"
                      }`}
                    >
                      Open website
                    </a>
                    <a
                      href={normalizeHref(selectedProfile.maps_url)}
                      target="_blank"
                      rel="noreferrer"
                      className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                        selectedProfile.maps_url
                          ? "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                          : "pointer-events-none border-slate-200 bg-slate-50 text-slate-400"
                      }`}
                    >
                      View maps
                    </a>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Trust profile
                    </div>
                    <div className="mt-2 text-base font-semibold text-slate-950">{selectedTrust.label}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      Rating, review volume, website presence, and phone availability are considered.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Review insight
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-700">{reviewInsight}</div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Rating
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      {formatRating(selectedProfile.rating)}
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-[linear-gradient(90deg,#f59e0b,#22c55e)]"
                        style={{
                          width: `${Math.min(100, Math.max(10, (Number(selectedProfile.rating) || 0) * 20))}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Reviews
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      {formatCompactNumber(selectedProfile.reviews)}
                    </div>
                    <div className="mt-2 text-sm text-slate-500">
                      {formatNumber(selectedProfile.reviews)} public reviews
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Address
                  </div>
                  <div className="mt-2 text-sm leading-7 text-slate-700">
                    {selectedProfile.address || "Address not available"}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Contact number
                    </div>
                    <div className="mt-2 break-all text-sm font-medium text-slate-950">
                      {selectedProfile.phone || "No phone available"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Website
                    </div>
                    <div className="mt-2 break-all text-sm font-medium text-slate-950">
                      {selectedProfile.website || "No website available"}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Qualification notes
                    </div>
                    <div className="text-xs font-medium text-slate-400">
                      {selectedProfile.record_id || "Unsaved record"}
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl border border-white bg-white px-4 py-4 text-sm leading-7 text-slate-700">
                    {draftNotes[selectedProfile.record_id || ""] || "No notes added yet."}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-sm leading-6 text-slate-500">
                Select a profile from the table to inspect rating, reviews, address, and qualification details in a cleaner side panel.
              </div>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}

export default ResultsPage;
