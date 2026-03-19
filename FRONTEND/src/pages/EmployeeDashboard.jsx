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

export default function EmployeeDashboard() {
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]); // ✅ NEW

  async function fetchHistory() {
    try {
      const res = await api.get("/transaction_history");
      setHistory(safeArray(res?.data));
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load history"));
    }
  }

  async function refresh() {
    setLoading(true);
    try {
      const res = await api.get("/pending_transactions");
      setItems(safeArray(res?.data));

      await fetchHistory(); // ✅ also fetch history
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load transactions"));
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
      await api.post("/approve_transaction", {
        transaction_id: transactionId,
        status,
      });

      toast.success(`Transaction ${status}`);
      await refresh(); // ✅ refresh both tables
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update transaction"));
    } finally {
      setActingId(null);
    }
  }

  const count = useMemo(() => items.length, [items.length]);

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-lg font-semibold tracking-tight text-slate-50">
            Employee approvals
          </div>
          <div className="mt-1 text-sm text-slate-400">
            Approve or reject transactions routed to employees.
          </div>
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

      {/* 🟡 CURRENT TRANSACTIONS */}
      <Card
        title="Current Transactions"
        subtitle="Pending + processed transactions routed to you."
        right={<Badge tone="neutral">{count} items</Badge>}
      >
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
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{t.id}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{t.amount}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{t.department_id}</td>
                    <td className="px-4 py-3">{t.approver_role}</td>

                    <td className="px-4 py-3">
                      <Badge tone={statusTone(t.status)}>
                        {t.status}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      {t.status === "pending" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => act(t.id, "approved")}
                            disabled={actingId === t.id}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-500/15"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Approve
                          </button>

                          <button
                            onClick={() => act(t.id, "rejected")}
                            disabled={actingId === t.id}
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/15"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">No actions</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-sm text-slate-400">
                    {loading ? "Loading..." : "No transactions."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 🟢 HISTORY TABLE */}
      <Card
        title="History"
        subtitle="Transactions approved/rejected by you."
        right={<Badge tone="neutral">{history.length} records</Badge>}
      >
        <div className="overflow-auto rounded-2xl border border-slate-800/60">
          <table className="min-w-[820px] w-full">
            <thead className="bg-slate-900/60">
              <tr className="text-left text-xs font-semibold text-slate-300">
                <th className="px-4 py-3">Transaction ID</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {history.length ? (
                history.map((h, i) => (
                  <tr key={i} className="text-sm text-slate-200 hover:bg-slate-900/40">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {h.transaction_id}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {h.amount}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(h.action)}>
                        {h.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {h.timestamp}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-sm text-slate-400">
                    No history available.
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