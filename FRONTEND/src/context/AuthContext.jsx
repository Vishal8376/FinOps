import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "../services/api.js";

const AuthContext = createContext(null);

function normalizeRole(role) {
  const r = String(role || "").toLowerCase();
  if (["admin", "manager", "employee", "vendor"].includes(r)) return r;
  return null;
}

function roleHome(role) {
  switch (normalizeRole(role)) {
    case "admin":
      return "/admin";
    case "manager":
      return "/manager";
    case "employee":
      return "/employee";
    case "vendor":
      return "/vendor";
    default:
      return "/login";
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("finops.jwt") || "");
  const [role, setRole] = useState(() => localStorage.getItem("finops.role") || "");
  const [userId, setUserId] = useState(() => localStorage.getItem("finops.user_id") || "");
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    setBooting(false);
  }, []);

  const isAuthed = Boolean(token);

  const login = useCallback(async ({ name, password }) => {
    const res = await api.post("/login", { name, password });
    const payload = res?.data || {};
    const nextToken = payload.token;
    const nextRole = normalizeRole(payload.role);
    const nextUserId = payload.user_id;

    if (!nextToken || !nextRole || !nextUserId) throw new Error("Invalid login response");

    localStorage.setItem("finops.jwt", nextToken);
    localStorage.setItem("finops.role", nextRole);
    localStorage.setItem("finops.user_id", String(nextUserId));
    setToken(nextToken);
    setRole(nextRole);
    setUserId(String(nextUserId));
    toast.success("Welcome back");
    return { role: nextRole, home: roleHome(nextRole) };
  }, []);

  const registerVendor = useCallback(async ({ name, password }) => {
    await api.post("/register", { name, password, role_id: 4 });
    toast.success("Vendor registered. You can sign in now.");
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("finops.jwt");
    localStorage.removeItem("finops.role");
    localStorage.removeItem("finops.user_id");
    setToken("");
    setRole("");
    setUserId("");
    toast.success("Logged out");
  }, []);

  const value = useMemo(
    () => ({
      booting,
      isAuthed,
      token,
      role: normalizeRole(role),
      userId,
      login,
      registerVendor,
      logout,
      roleHome
    }),
    [booting, isAuthed, token, role, userId, login, registerVendor, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function requireRole(currentRole, allowed) {
  const r = normalizeRole(currentRole);
  return Boolean(r && allowed.includes(r));
}

export function apiErrorToast(err, fallback) {
  toast.error(getErrorMessage(err, fallback));
}

