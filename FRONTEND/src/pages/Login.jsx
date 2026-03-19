import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, ArrowRight } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../services/api.js";

export default function Login() {
  const navigate = useNavigate();
  const { login, registerVendor } = useAuth();
  const [mode, setMode] = useState("login"); // login | register
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const canSubmit = useMemo(() => name.trim() && password && !loading, [name, password, loading]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setFormError("");
    setLoading(true);
    try {
      if (mode === "register") {
        await registerVendor({ name: name.trim(), password });
        setMode("login");
      } else {
        const res = await login({ name: name.trim(), password });
        navigate(res.home, { replace: true });
      }
    } catch (err) {
      setFormError(getErrorMessage(err, "Unable to continue"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10 md:px-6">
        <div className="grid w-full gap-6 md:grid-cols-2 md:gap-10">
          <div className="rounded-3xl border border-slate-800/60 bg-gradient-to-br from-slate-900/60 via-slate-950 to-slate-950 p-7 shadow-soft md:p-9">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 text-slate-950">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">FinOps Governance</div>
                <div className="text-xs text-slate-400">Role-based approvals · Blockchain audit</div>
              </div>
            </div>

            <h1 className="mt-6 text-2xl font-semibold tracking-tight md:text-3xl">
              Professional financial controls, with auditable approvals.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Sign in to access your role dashboard. Vendors can self-register to submit funding requests. Managers and
              employees approve pending transactions.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/30 p-4">
                <div className="text-xs font-semibold text-slate-200">Duplicate prevention</div>
                <div className="mt-1 text-xs text-slate-400">Buttons disable while requests are running.</div>
              </div>
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/30 p-4">
                <div className="text-xs font-semibold text-slate-200">Safe UX</div>
                <div className="mt-1 text-xs text-slate-400">Toasts + clear errors (no double submits).</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/20 p-7 shadow-card md:p-9">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{mode === "login" ? "Sign in" : "Vendor registration"}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {mode === "login" ? "Use your credentials to continue." : "Create a vendor account to request funds."}
                </div>
              </div>
              <div className="flex rounded-2xl border border-slate-800/60 bg-slate-950 p-1">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={clsx(
                    "rounded-xl px-3 py-2 text-xs font-semibold transition",
                    mode === "login" ? "bg-slate-900/70 text-white" : "text-slate-300 hover:text-white"
                  )}
                  disabled={loading}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className={clsx(
                    "rounded-xl px-3 py-2 text-xs font-semibold transition",
                    mode === "register" ? "bg-slate-900/70 text-white" : "text-slate-300 hover:text-white"
                  )}
                  disabled={loading}
                >
                  Register
                </button>
              </div>
            </div>

            {formError ? (
              <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {formError}
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-5 grid gap-4">
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold text-slate-200">Username</span>
                <input
                  className="rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:ring-0"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="username"
                  placeholder="e.g. admin"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-semibold text-slate-200">Password</span>
                <input
                  type="password"
                  className="rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:ring-0"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="Your password"
                />
              </label>

              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-soft transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Working…" : mode === "login" ? "Sign in" : "Create vendor account"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-5 text-xs text-slate-500">
              Backend base URL:{" "}
              <span className="font-mono text-slate-400">{import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000"}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Tip: Admin seeded credentials are typically <span className="font-mono text-slate-400">admin / admin123</span>.
            </div>
            <div className="mt-5 text-xs text-slate-500">
              <Link to="/" className="text-slate-400 hover:text-slate-200">
                Having trouble? Check backend is running.
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}