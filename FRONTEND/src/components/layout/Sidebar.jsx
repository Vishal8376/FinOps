import React, { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Shield, UserCheck, Briefcase, LogOut } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../../context/AuthContext.jsx";

function routesForRole(role) {
  switch (role) {
    case "admin":
      return [{ to: "/admin", label: "Admin", icon: Shield }];
    case "manager":
      return [{ to: "/manager", label: "Manager", icon: LayoutDashboard }];
    case "employee":
      return [{ to: "/employee", label: "Employee", icon: UserCheck }];
    case "vendor":
      return [{ to: "/vendor", label: "Vendor", icon: Briefcase }];
    default:
      return [];
  }
}

export default function Sidebar() {
  const { role, logout } = useAuth();
  const items = useMemo(() => routesForRole(role), [role]);

  return (
    <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 border-r border-slate-800/60 bg-slate-950/70 backdrop-blur md:block">
      <div className="flex h-full flex-col px-4 py-5">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800/60 bg-slate-900/40 px-3 py-3 shadow-soft">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 text-slate-950">
            <Shield className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">FinOps Governance</div>
            <div className="truncate text-xs text-slate-400">Role-based console</div>
          </div>
        </div>

        <nav className="mt-5 flex flex-1 flex-col gap-1">
          {items.map((r) => {
            const Icon = r.icon;
            return (
              <NavLink
                key={r.to}
                to={r.to}
                className={({ isActive }) =>
                  clsx(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    isActive
                      ? "bg-slate-900/70 text-slate-50 shadow-card"
                      : "text-slate-300 hover:bg-slate-900/50 hover:text-slate-50"
                  )
                }
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-slate-800/60 bg-slate-900/40 text-slate-200 group-hover:text-slate-50">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="truncate">{r.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={logout}
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800/70 bg-slate-900/40 px-3 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-900/70 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

