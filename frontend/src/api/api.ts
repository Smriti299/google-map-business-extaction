import axios from "axios";

function normalizeApiBaseUrl(url?: string) {
  const fallback = "/api";
  if (!url) {
    return fallback;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return fallback;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const parsedUrl = new URL(trimmed);
    const pathname = parsedUrl.pathname === "/" || parsedUrl.pathname === ""
      ? "/api"
      : parsedUrl.pathname.endsWith("/api")
        ? parsedUrl.pathname
        : `${parsedUrl.pathname.replace(/\/$/, "")}/api`;
    return `${parsedUrl.origin}${pathname}`;
  }

  if (trimmed.startsWith("/")) {
    return trimmed.endsWith("/api") ? trimmed : `${trimmed.replace(/\/$/, "")}/api`;
  }

  if (trimmed.startsWith("://")) {
    return `http${trimmed}`;
  }

  if (trimmed.startsWith(":")) {
    return `http://localhost${trimmed}`;
  }

  return trimmed.startsWith("api") ? `/${trimmed}` : `/${trimmed}`;
}

const api = axios.create({
  baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
  timeout: 15000,
  withCredentials: true,
});

function getCookie(name: string) {
  const match = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : undefined;
}

api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase() ?? "GET";
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfCookieName = import.meta.env.VITE_CSRF_COOKIE_NAME || "gmb_csrf";
    const csrfToken = getCookie(csrfCookieName);
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }
  }
  return config;
});

export interface StartJobPayload {
  query: string;
  location?: string;
  limit: number;
}

export interface Job {
  id: string;
  request: {
    query: string;
    location?: string;
    limit: number;
  };
  status: string;
  created_at: string;
  updated_at?: string;
  result_count: number;
  error?: string;
}

export interface RecordUpdatePayload {
  lead_status?: string;
  notes?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  role: string;
}

export async function login(email: string, password: string, rememberMe: boolean) {
  const response = await api.post<{ user: AuthUser }>('auth/login', {
    email,
    password,
    remember_me: rememberMe,
  });
  return response.data.user;
}

export async function logout() {
  await api.post('auth/logout');
}

export async function getCurrentUser() {
  const response = await api.get<AuthUser>('auth/me');
  return response.data;
}

export async function startJob(payload: StartJobPayload) {
  const response = await api.post<Job>('start-job', payload);
  return response.data;
}

export async function listJobs() {
  const response = await api.get<{ jobs?: Job[] }>('jobs');
  return response.data.jobs ?? [];
}

export async function getJob(jobId: string) {
  const response = await api.get<Job>(`job/${jobId}`);
  return response.data;
}

export async function deleteJob(jobId: string) {
  await api.delete(`job/${jobId}`);
}

export async function getResults(jobId: string) {
  const response = await api.get<Record<string, unknown>[]>(`job/${jobId}/results`);
  return response.data;
}

export async function updateRecord(jobId: string, recordId: string, payload: RecordUpdatePayload) {
  const response = await api.patch<{ record_id: string; lead_status: string; notes: string }>(
    `job/${jobId}/records/${recordId}`,
    payload
  );
  return response.data;
}

export async function createExport(jobId: string, format: string) {
  const response = await api.get<{ job_id: string; format: string; file_name: string }>(
    `export/${jobId}`,
    { params: { format } }
  );
  return response.data;
}

export function downloadExport(jobId: string, format: string) {
  const baseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
  window.open(`${baseUrl}/export/${jobId}/download?format=${format}`, "_blank");
}
