import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const links = [
  { to: "/dashboard", label: "Dashboard", short: "DB" },
  { to: "/search", label: "Discovery", short: "DS" },
  { to: "/jobs", label: "Records", short: "RC" },
  { to: "/results", label: "Results", short: "RS" },
  { to: "/exports", label: "Exports", short: "EX" },
];

function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <aside className="sticky top-0 flex h-screen flex-col overflow-y-auto border-r border-white/10 bg-slate-950 text-white">
      <div className="border-b border-white/10 px-5 py-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
          Operations Console
        </div>
        <div className="mt-3 text-2xl font-semibold tracking-tight">GMB Extractor</div>
        <div className="mt-2 text-sm leading-6 text-slate-400">
          Enterprise workspace for business discovery, qualification, and exports.
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-3 py-5">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                isActive
                  ? "border-cyan-400/40 bg-cyan-400/12 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.14)]"
                  : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border text-[11px] font-semibold tracking-[0.18em] ${
                    isActive
                      ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                      : "border-white/10 bg-white/5 text-slate-400"
                  }`}
                >
                  {link.short}
                </span>
                <div className="min-w-0">
                  <div>{link.label}</div>
                  <div className={`mt-0.5 text-xs ${isActive ? "text-cyan-200/70" : "text-slate-500"}`}>
                    Workspace view
                  </div>
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white">{user?.full_name || user?.email}</div>
            <div className="truncate text-xs text-slate-500">{user?.email}</div>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            Logout
          </button>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Trust Layer
          </div>
          <div className="mt-2 text-sm font-medium text-white">Audit-ready workspace</div>
          <div className="mt-2 text-sm leading-6 text-slate-400">
            Structured records, persistent notes, and controlled exports for real-world usage.
          </div>
        </div>
      </div>
    </aside>
  );
}

export default NavBar;
