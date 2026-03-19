import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Send } from "lucide-react";
import Card from "../components/ui/Card.jsx";
import Badge from "../components/ui/Badge.jsx";
import { api, getErrorMessage } from "../services/api.js";
import clsx from "clsx";

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "success";
  if (s === "rejected") return "danger";
  return "warning";
}

export default function VendorDashboard() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [amount, setAmount] = useState("");
  const [departmentId, setDepartmentId] = useState("1");

  const canSubmit = useMemo(() => Number(amount) > 0 && departmentId && !submitting, [amount, departmentId, submitting]);

  async function refresh() {
    setLoading(true);
    try {
      const [deptRes, txRes] = await Promise.all([api.get("/list_departments"), api.get("/vendor_transactions")]);
      setDepartments(safeArray(deptRes?.data));
      setTransactions(safeArray(txRes?.data));
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load vendor data"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onRequest(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await api.post("/request_transaction", { amount: Number(amount), department_id: Number(departmentId) });
      toast.success(`Request submitted · Routed to ${res?.data?.routed_to ?? "approver"}`);
      setAmount("");
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to request transaction"));
    } finally {
      setSubmitting(false);
    }
  }

  const deptOptions = departments.length ? departments : [{ id: 1, name: "General" }];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-lg font-semibold tracking-tight text-slate-50">Vendor requests</div>
          <div className="mt-1 text-sm text-slate-400">Submit requests and track approval status.</div>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-900/70 disabled:opacity-60"
        >
          <RefreshCw className={clsx("h-4 w-4", loading ? "animate-spin" : "")} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="New request" subtitle="Requests route by % of department budget.">
          <form onSubmit={onRequest} className="grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-200">Amount</span>
              <input
                className="rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:ring-0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 1200"
                disabled={submitting}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-200">Department</span>
              <select
                className="rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-100 focus:border-slate-600 focus:ring-0"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={submitting}
              >
                {deptOptions.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name ?? `Dept ${d.id}`}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-soft transition hover:opacity-95 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </form>
        </Card>

        <Card title="Status guide" subtitle="What each status means.">
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/30 px-3 py-2">
              <Badge tone="warning">pending</Badge>
              <span className="text-slate-400">Awaiting approval</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/30 px-3 py-2">
              <Badge tone="success">approved</Badge>
              <span className="text-slate-400">Approved & logged</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/30 px-3 py-2">
              <Badge tone="danger">rejected</Badge>
              <span className="text-slate-400">Declined</span>
            </div>
          </div>
        </Card>

        <Card title="Summary" subtitle="Your transactions overview." right={<Badge tone="neutral">{transactions.length} total</Badge>}>
          <div className="text-sm text-slate-400">
            Latest:{" "}
            {transactions.length ? (
              <span className="text-slate-200">
                #{transactions[transactions.length - 1]?.id ?? "—"} ·{" "}
                {transactions[transactions.length - 1]?.status ?? "pending"}
              </span>
            ) : (
              <span className="text-slate-500">No requests yet</span>
            )}
          </div>
        </Card>
      </div>

      <Card title="Transaction history" subtitle="All requests for the signed-in vendor.">
        <div className="overflow-auto rounded-2xl border border-slate-800/60">
          <table className="min-w-[820px] w-full">
            <thead className="bg-slate-900/60">
              <tr className="text-left text-xs font-semibold text-slate-300">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Approver</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {transactions.length ? (
                transactions
                  .slice()
                  .reverse()
                  .map((t) => (
                    <tr key={t.id} className="text-sm text-slate-200 hover:bg-slate-900/40">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{t.id ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{t.amount ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{t.department_id ?? "—"}</td>
                      <td className="px-4 py-3">{t.approver_role ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(t.status)}>{t.status ?? "pending"}</Badge>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={5}>
                    {loading ? "Loading transactions…" : "No transactions yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

