import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
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

export default function ManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [items, setItems] = useState([]);

  async function refresh() {
    setLoading(true);
    try {
      const res = await api.get("/pending_transactions");
      // Backend returns pending for current role; frontend contract expects endpoint exists.
      const data = safeArray(res?.data);
      setItems(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load pending transactions"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function act(transactionId, status) {
    if (!transactionId || actingId) return;
    setActingId(transactionId);
    try {
      await api.post("/approve_transaction", { transaction_id: transactionId, status });
      toast.success(`Transaction ${status}`);
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update transaction"));
    } finally {
      setActingId(null);
    }
  }

  const count = useMemo(() => items.length, [items.length]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-lg font-semibold tracking-tight text-slate-50">Manager approvals</div>
          <div className="mt-1 text-sm text-slate-400">Review pending transactions and approve or reject.</div>
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

      <Card title="Pending queue" subtitle="Only pending items routed to your role." right={<Badge tone="neutral">{count} pending</Badge>}>
        <div className="overflow-auto rounded-2xl border border-slate-800/60">
          <table className="min-w-[820px] w-full">
            <thead className="bg-slate-900/60">
              <tr className="text-left text-xs font-semibold text-slate-300">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Approver role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.length ? (
                items.map((t) => (
                  <tr key={t.id} className="text-sm text-slate-200 hover:bg-slate-900/40">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{t.id ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{t.amount ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{t.department_id ?? "—"}</td>
                    <td className="px-4 py-3">{t.approver_role ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(t.status)}>{t.status ?? "pending"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => act(t.id, "approved")}
                          disabled={actingId === t.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/15 disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => act(t.id, "rejected")}
                          disabled={actingId === t.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/15 disabled:opacity-60"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={6}>
                    {loading ? "Loading pending transactions…" : "No pending transactions."}
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

