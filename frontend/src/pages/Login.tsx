import axios from "axios";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
  }
  return "Unable to sign in. Please try again.";
}

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const emailRef = useRef<HTMLInputElement | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  if (user) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password, rememberMe);
      navigate(from, { replace: true });
    } catch (loginError) {
      setError(getErrorMessage(loginError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-950 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(460px,0.75fr)]">
      <section className="relative hidden overflow-hidden bg-slate-950 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_32%),linear-gradient(135deg,rgba(15,23,42,1),rgba(8,47,73,0.84))]" />
        <div className="relative">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">
            Operations Console
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/25 bg-cyan-200/10 text-sm font-bold tracking-[0.2em] text-cyan-100">
              GMB
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">GMB Extractor</h1>
              <p className="mt-1 text-sm text-cyan-100/70">
                Transform Google Maps data into actionable business insights.
              </p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur">
              <div className="grid grid-cols-3 gap-3">
                {[72, 54, 86, 62, 44, 78].map((height, index) => (
                  <div key={index} className="flex h-28 items-end rounded-2xl bg-slate-900/70 p-3">
                    <div
                      className="w-full rounded-xl bg-cyan-300/80"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-100/70">Profiles</div>
                <div className="mt-3 text-3xl font-semibold">10k+</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-100/70">Exports</div>
                <div className="mt-3 text-3xl font-semibold">Ready</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative text-sm leading-6 text-slate-300">
          Secure access for team workflows, persistent records, and controlled exports.
        </div>
      </section>

      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-[2rem] border border-white bg-white p-7 shadow-2xl shadow-slate-300/60 sm:p-8"
        >
          <div className="mb-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-700">
              Secure workspace
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sign in to manage extraction jobs, results, and exports.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <div className="mt-2 flex h-12 rounded-2xl border border-slate-200 bg-slate-50 transition focus-within:border-cyan-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-100">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-w-0 flex-1 rounded-2xl bg-transparent px-4 text-sm outline-none"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="px-4 text-sm font-medium text-cyan-700"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-cyan-600"
              />
              Remember me
            </label>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}

export default LoginPage;
