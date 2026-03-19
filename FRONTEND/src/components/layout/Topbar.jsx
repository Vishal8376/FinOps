import React from "react";
import { useLocation } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../../context/AuthContext.jsx";

function titleForPath(pathname) {
  if (pathname.startsWith("/admin")) return "Admin Dashboard";
  if (pathname.startsWith("/manager")) return "Manager Dashboard";
  if (pathname.startsWith("/employee")) return "Employee Dashboard";
  if (pathname.startsWith("/vendor")) return "Vendor Dashboard";
  return "Dashboard";
}

export default function Topbar() {
  const { role, userId } = useAuth();
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/60 bg-slate-950/55 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 md:px-6">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-100">{titleForPath(pathname)}</div>
          <div className="truncate text-xs text-slate-400">
            Signed in as <span className="font-semibold text-slate-200">{role || "—"}</span>
            {userId ? <span className="text-slate-500"> · ID {userId}</span> : null}
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              className={clsx(
                "w-64 rounded-xl border border-slate-800/70 bg-slate-900/40 pl-10 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-500",
                "focus:border-slate-600 focus:ring-0"
              )}
              placeholder="Search (UI only)"
              readOnly
            />
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-800/70 bg-slate-900/40 text-slate-300 transition hover:bg-slate-900/70 hover:text-slate-50"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

