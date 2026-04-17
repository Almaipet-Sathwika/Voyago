import { Link, NavLink } from "react-router-dom";
import { useAppMode } from "../context/AppModeContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { setMode, isTripora } = useAppMode();
  const { user, logout, isHost, loading } = useAuth();

  const toggleBtn =
    "rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex flex-col gap-0.5 sm:min-w-0">
            <Link
              to="/tripora"
              className="font-display text-2xl font-bold tracking-tight text-brand-ink"
            >
              <span className="bg-gradient-to-r from-rose-600 to-rose-500 bg-clip-text text-transparent">
                Voyago
              </span>
            </Link>
            <p className="text-xs font-medium text-slate-500 sm:text-sm">Travel smart. Stay better.</p>
          </div>

          <nav
            className="flex flex-1 items-center justify-center sm:justify-center"
            aria-label="Voyago modules"
          >
            <div className="inline-flex w-full max-w-xs rounded-full bg-slate-100 p-1 shadow-inner sm:max-w-none sm:w-auto">
              <button
                type="button"
                onClick={() => setMode("tripora")}
                className={`${toggleBtn} flex-1 sm:flex-none ${
                  isTripora
                    ? "bg-white text-rose-600 shadow-sm ring-1 ring-slate-200/80"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Tripora
              </button>
              <button
                type="button"
                onClick={() => setMode("stayora")}
                className={`${toggleBtn} flex-1 sm:flex-none ${
                  !isTripora
                    ? "bg-white text-orange-600 shadow-sm ring-1 ring-slate-200/80"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Stayora
              </button>
            </div>
          </nav>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {!loading && user && (
              <div className="mr-2 flex items-center gap-1 cursor-default rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-brand-ink shadow-sm" title="Your reward points">
                <span className="text-sm">✨</span>
                <span>{user.points || 0}</span>
              </div>
            )}
            {!loading && user && (
              <NavLink
                to="/my-bookings"
                className={({ isActive }) =>
                  `rounded-full px-3 py-2 text-sm font-medium ${
                    isActive ? "bg-rose-100 text-rose-800" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                My bookings
              </NavLink>
            )}
            {!loading && user && isHost && (
              <NavLink
                to="/host"
                className={({ isActive }) =>
                  `hidden rounded-full px-3 py-2 text-sm font-medium sm:inline-block ${
                    isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                Host
              </NavLink>
            )}
            {!loading && !user && (
              <>
                <Link
                  to="/login"
                  className="rounded-full px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded-full bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-rose-500 hover:to-rose-400"
                >
                  Sign up
                </Link>
              </>
            )}
            {!loading && user && (
              <div className="flex items-center gap-2">
                <span className="hidden max-w-[120px] truncate text-sm text-slate-600 sm:inline line-clamp-1">
                  {user.name}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
