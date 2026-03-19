import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
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
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/60 bg-slate-950/55 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 md:px-6">
        
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-100">
            {titleForPath(pathname)}
          </div>
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
              placeholder="Search"
              readOnly
            />
          </div>

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/login");
            }}
            className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
          >
            Logout
          </button>
        </div>

      </div>
    </header>
  );
}