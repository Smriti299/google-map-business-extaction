import { Route, Routes, Navigate, NavLink, Outlet } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
import { useAuth } from "./auth/AuthContext";
import NavBar from "./components/NavBar";
import Dashboard from "./pages/Dashboard";
import SearchPage from "./pages/Search";
import JobsPage from "./pages/Jobs";
import ResultsPage from "./pages/Results";
import ExportsPage from "./pages/Exports";
import LoginPage from "./pages/Login";

function AppShell() {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-transparent text-slate-900 lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="hidden lg:block">
        <NavBar />
      </div>

      <div className="flex min-h-screen flex-col">
        <div className="border-b border-slate-200/70 bg-white/75 px-4 py-4 shadow-sm backdrop-blur lg:hidden">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-700">
            Operations Console
          </div>
          <div className="mt-2 text-xl font-semibold text-slate-950">GMB Extractor</div>
          <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span className="truncate">{user?.email}</span>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700"
            >
              Logout
            </button>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {[
              ["/dashboard", "Dashboard"],
              ["/search", "Discovery"],
              ["/jobs", "Records"],
              ["/results", "Results"],
              ["/exports", "Exports"],
            ].map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full border px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-cyan-300 bg-cyan-50 text-cyan-800"
                      : "border-slate-200 bg-white text-slate-600"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 2xl:px-10">
          <div className="mx-auto w-full max-w-7xl 2xl:max-w-[1500px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/results/:jobId" element={<ResultsPage />} />
          <Route path="/exports" element={<ExportsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
