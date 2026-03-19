import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, RefreshCw, Trash2, Users, Building2, Wallet, Link2 } from "lucide-react";
import Card from "../components/ui/Card.jsx";
import Modal from "../components/ui/Modal.jsx";
import Badge from "../components/ui/Badge.jsx";
import { api, getErrorMessage } from "../services/api.js";
import clsx from "clsx";

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

export default function AdminDashboard() {
  const [bootLoading, setBootLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [budgets, setBudgets] = useState([]);

  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [openUser, setOpenUser] = useState(false);
  const [openDept, setOpenDept] = useState(false);
  const [openBudget, setOpenBudget] = useState(false);

  // Create user form
  const [uName, setUName] = useState("");
  const [uPass, setUPass] = useState("");
  const [uRoleId, setURoleId] = useState("2");
  const [uDeptId, setUDeptId] = useState("1");
  const [uSubmitting, setUSubmitting] = useState(false);

  // Create department
  const [dName, setDName] = useState("");
  const [dSubmitting, setDSubmitting] = useState(false);

  // Allocate budget
  const [bDeptId, setBDeptId] = useState("1");
  const [bTotal, setBTotal] = useState("");
  const [bSubmitting, setBSubmitting] = useState(false);

  const canCreateUser = useMemo(
    () => uName.trim() && uPass && uRoleId && uDeptId && !uSubmitting,
    [uName, uPass, uRoleId, uDeptId, uSubmitting]
  );
  const canCreateDept = useMemo(() => dName.trim() && !dSubmitting, [dName, dSubmitting]);
  const canAllocate = useMemo(() => Number(bTotal) > 0 && bDeptId && !bSubmitting, [bTotal, bDeptId, bSubmitting]);

  async function loadAll({ silent } = { silent: false }) {
    if (!silent) setRefreshing(true);
    try {
      const [usersRes, deptRes, logsRes, budgetsRes] = await Promise.all([
        api.get("/list_users"),
        api.get("/list_departments"),
        api.get("/audit_logs"),
        api.get("/list_budgets")
      ]);
      setUsers(safeArray(usersRes?.data));
      setDepartments(safeArray(deptRes?.data));
      setAuditLogs(safeArray(logsRes?.data));
      setBudgets(safeArray(budgetsRes?.data));
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load admin data"));
    } finally {
      setRefreshing(false);
      setBootLoading(false);
    }
  }

  useEffect(() => {
    loadAll({ silent: true });
  }, []);

  async function onCreateUser() {
    if (!canCreateUser) return;
    setUSubmitting(true);
    try {
      await api.post("/create_user", {
        name: uName.trim(),
        password: uPass,
        role_id: Number(uRoleId),
        department_id: Number(uDeptId)
      });
      toast.success("User created");
      setUName("");
      setUPass("");
      setURoleId("2");
      setOpenUser(false);
      await loadAll({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to create user"));
    } finally {
      setUSubmitting(false);
    }
  }

  async function onDeleteUser(user) {
    const id = user?.id;
    if (!id) return;
    const ok = window.confirm(`Delete user "${user?.name ?? id}" (ID ${id})?`);
    if (!ok) return;
    // Prevent double click
    if (refreshing) return;
    setRefreshing(true);
    try {
      await api.delete(`/delete_user/${id}`);
      toast.success("User deleted");
      await loadAll({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete user"));
    } finally {
      setRefreshing(false);
    }
  }

  async function onCreateDepartment() {
    if (!canCreateDept) return;
    setDSubmitting(true);
    try {
      await api.post("/create_department", { name: dName.trim() });
      toast.success("Department created");
      setDName("");
      setOpenDept(false);
      await loadAll({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to create department"));
    } finally {
      setDSubmitting(false);
    }
  }

  async function onAllocateBudget() {
    if (!canAllocate) return;
    setBSubmitting(true);
    try {
      await api.post("/allocate_budget", { department_id: Number(bDeptId), total_budget: Number(bTotal) });
      toast.success("Budget allocated");
      setBTotal("");
      setOpenBudget(false);
      await loadAll({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to allocate budget"));
    } finally {
      setBSubmitting(false);
    }
  }

  const deptOptions = departments.length ? departments : [{ id: 1, name: "General" }];
  const budgetByDept = useMemo(() => {
    const map = new Map();
    safeArray(budgets).forEach((b) => {
      if (b?.department_id != null) map.set(String(b.department_id), b);
    });
    return map;
  }, [budgets]);

  const stats = [
    { label: "Users", value: users.length, icon: Users },
    { label: "Departments", value: departments.length, icon: Building2 },
    { label: "Budgets", value: budgets.length, icon: Wallet }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-lg font-semibold tracking-tight text-slate-50">Administration</div>
          <div className="mt-1 text-sm text-slate-400">
            Manage users, departments, budgets, and review blockchain-anchored audit logs.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadAll({ silent: false })}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-900/70 disabled:opacity-60"
            disabled={refreshing}
          >
            <RefreshCw className={clsx("h-4 w-4", refreshing ? "animate-spin" : "")} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setOpenUser(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 px-3 py-2 text-sm font-semibold text-slate-950 shadow-soft transition hover:opacity-95 disabled:opacity-60"
            disabled={refreshing}
          >
            <Plus className="h-4 w-4" />
            Create user
          </button>
          <button
            type="button"
            onClick={() => setOpenDept(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-900/70"
            disabled={refreshing}
          >
            <Building2 className="h-4 w-4" />
            Create dept
          </button>
          <button
            type="button"
            onClick={() => setOpenBudget(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-900/70"
            disabled={refreshing}
          >
            <Wallet className="h-4 w-4" />
            Allocate budget
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card
              key={s.label}
              title={s.label}
              right={
                <span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-800/60 bg-slate-900/40">
                  <Icon className="h-4 w-4 text-slate-200" />
                </span>
              }
              subtitle={bootLoading ? "Loading…" : "Live from backend"}
            >
              <div className="text-2xl font-semibold text-slate-50">{s.value}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Users"
          subtitle="Create and manage accounts across roles."
          right={<Badge tone="neutral">{users.length} total</Badge>}
        >
          <div className="overflow-auto rounded-2xl border border-slate-800/60">
            <table className="min-w-[720px] w-full">
              <thead className="bg-slate-900/60">
                <tr className="text-left text-xs font-semibold text-slate-300">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.length ? (
                  users.map((u) => (
                    <tr key={u.id} className="text-sm text-slate-200 hover:bg-slate-900/40">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{u.id ?? "—"}</td>
                      <td className="px-4 py-3">{u.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge tone={u.role === "admin" ? "warning" : u.role === "vendor" ? "neutral" : "success"}>
                          {u.role ?? "—"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{u.department_id ?? "—"}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onDeleteUser(u)}
                          disabled={refreshing}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/15 disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-400" colSpan={5}>
                      {bootLoading ? "Loading users…" : "No users found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Budgets"
          subtitle="Department budgets and remaining capacity."
          right={<Badge tone="neutral">{budgets.length} budgets</Badge>}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {departments.length ? (
              departments.slice(0, 6).map((d) => {
                const b = budgetByDept.get(String(d.id));
                const total = Number(b?.total_budget ?? 0);
                const used = Number(b?.used_budget ?? 0);
                const remaining = Number(b?.remaining_budget ?? total - used);
                const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((used / total) * 100))) : 0;
                return (
                  <div
                    key={d.id}
                    className="rounded-2xl border border-slate-800/60 bg-slate-900/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-100">{d.name ?? `Dept ${d.id}`}</div>
                        <div className="mt-1 text-xs text-slate-400">Dept ID {d.id}</div>
                      </div>
                      <Badge tone={remaining > 0 ? "success" : "danger"}>{remaining > 0 ? "Healthy" : "Over"}</Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Total</span>
                        <span className="font-mono text-slate-300">{total.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Used</span>
                        <span className="font-mono text-slate-300">{used.toFixed(0)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800/70">
                        <div className="h-full bg-gradient-to-r from-sky-400 to-emerald-400" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Remaining</span>
                        <span className="font-mono text-slate-300">{remaining.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-slate-400">{bootLoading ? "Loading departments…" : "No departments found."}</div>
            )}
          </div>

          <div className="mt-4 overflow-auto rounded-2xl border border-slate-800/60">
            <table className="min-w-[820px] w-full">
              <thead className="bg-slate-900/60">
                <tr className="text-left text-xs font-semibold text-slate-300">
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Used</th>
                  <th className="px-4 py-3">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {budgets.length ? (
                  budgets.map((b) => (
                    <tr key={b.department_id} className="text-sm text-slate-200 hover:bg-slate-900/40">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-100">{b.name ?? `Dept ${b.department_id}`}</span>
                          <span className="text-xs text-slate-500">ID {b.department_id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{Number(b.total_budget ?? 0).toFixed(0)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{Number(b.used_budget ?? 0).toFixed(0)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{Number(b.remaining_budget ?? 0).toFixed(0)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-400" colSpan={4}>
                      {bootLoading ? "Loading budgets…" : "No budgets found. Allocate a budget to get started."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card
        title="Audit logs"
        subtitle="Blockchain-anchored approval trail (hash truncated)."
        right={<Badge tone="neutral">{auditLogs.length} records</Badge>}
      >
        <div className="overflow-auto rounded-2xl border border-slate-800/60">
          <table className="min-w-[720px] w-full">
            <thead className="bg-slate-900/60">
              <tr className="text-left text-xs font-semibold text-slate-300">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Current hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {auditLogs.length ? (
                auditLogs
                  .slice()
                  .reverse()
                  .slice(0, 20)
                  .map((l) => (
                    <tr key={l.id} className="text-sm text-slate-200 hover:bg-slate-900/40">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{l.id ?? "—"}</td>
                      <td className="px-4 py-3">{l.action ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{String(l.current_hash ?? "—").slice(0, 14)}…</td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={3}>
                    {bootLoading ? "Loading audit logs…" : "No audit logs found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={openUser}
        title="Create user"
        onClose={() => (!uSubmitting ? setOpenUser(false) : null)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpenUser(false)}
              disabled={uSubmitting}
              className="rounded-xl border border-slate-800/70 bg-slate-900/40 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/70 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onCreateUser}
              disabled={!canCreateUser}
              className="rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-soft disabled:opacity-60"
            >
              {uSubmitting ? "Creating…" : "Create"}
            </button>
          </div>
        }
      >
        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-slate-200">Name</span>
            <input
              className="rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:ring-0"
              value={uName}
              onChange={(e) => setUName(e.target.value)}
              placeholder="e.g. alice"
              disabled={uSubmitting}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-slate-200">Password</span>
            <input
              type="password"
              className="rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:ring-0"
              value={uPass}
              onChange={(e) => setUPass(e.target.value)}
              placeholder="Temporary password"
              disabled={uSubmitting}
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-200">Role</span>
              <select
                className="rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-100 focus:border-slate-600 focus:ring-0"
                value={uRoleId}
                onChange={(e) => setURoleId(e.target.value)}
                disabled={uSubmitting}
              >
                <option value="2">Manager</option>
                <option value="3">Employee</option>
                <option value="4">Vendor</option>
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-200">Department</span>
              <select
                className="rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-100 focus:border-slate-600 focus:ring-0"
                value={uDeptId}
                onChange={(e) => setUDeptId(e.target.value)}
                disabled={uSubmitting}
              >
                {deptOptions.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name ?? `Dept ${d.id}`}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </Modal>

      <Modal
        open={openDept}
        title="Create department"
        onClose={() => (!dSubmitting ? setOpenDept(false) : null)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpenDept(false)}
              disabled={dSubmitting}
              className="rounded-xl border border-slate-800/70 bg-slate-900/40 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/70 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onCreateDepartment}
              disabled={!canCreateDept}
              className="rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-soft disabled:opacity-60"
            >
              {dSubmitting ? "Creating…" : "Create"}
            </button>
          </div>
        }
      >
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold text-slate-200">Department name</span>
          <input
            className="rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:ring-0"
            value={dName}
            onChange={(e) => setDName(e.target.value)}
            placeholder="e.g. Procurement"
            disabled={dSubmitting}
          />
        </label>
      </Modal>

      <Modal
        open={openBudget}
        title="Allocate budget"
        onClose={() => (!bSubmitting ? setOpenBudget(false) : null)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpenBudget(false)}
              disabled={bSubmitting}
              className="rounded-xl border border-slate-800/70 bg-slate-900/40 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/70 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onAllocateBudget}
              disabled={!canAllocate}
              className="rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-soft disabled:opacity-60"
            >
              {bSubmitting ? "Saving…" : "Allocate"}
            </button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-slate-200">Department</span>
            <select
              className="rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-100 focus:border-slate-600 focus:ring-0"
              value={bDeptId}
              onChange={(e) => setBDeptId(e.target.value)}
              disabled={bSubmitting}
            >
              {deptOptions.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name ?? `Dept ${d.id}`}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-slate-200">Total budget</span>
            <input
              className="rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:ring-0"
              value={bTotal}
              onChange={(e) => setBTotal(e.target.value)}
              inputMode="decimal"
              placeholder="e.g. 50000"
              disabled={bSubmitting}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}

