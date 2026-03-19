import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth, requireRole } from "../context/AuthContext.jsx";
import Login from "../pages/Login.jsx";
import AdminDashboard from "../pages/AdminDashboard.jsx";
import ManagerDashboard from "../pages/ManagerDashboard.jsx";
import EmployeeDashboard from "../pages/EmployeeDashboard.jsx";
import VendorDashboard from "../pages/VendorDashboard.jsx";
import DashboardShell from "../components/layout/DashboardShell.jsx";

function Protected({ allowedRoles, children }) {
  const { isAuthed, role, booting, roleHome } = useAuth();
  if (booting) return null;
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (allowedRoles && !requireRole(role, allowedRoles)) return <Navigate to={roleHome(role)} replace />;
  return children;
}

function HomeRedirect() {
  const { isAuthed, role, booting, roleHome } = useAuth();
  if (booting) return null;
  if (!isAuthed) return <Navigate to="/login" replace />;
  return <Navigate to={roleHome(role)} replace />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/admin"
        element={
          <Protected allowedRoles={["admin"]}>
            <DashboardShell />
          </Protected>
        }
      >
        <Route index element={<AdminDashboard />} />
      </Route>

      <Route
        path="/manager"
        element={
          <Protected allowedRoles={["manager"]}>
            <DashboardShell />
          </Protected>
        }
      >
        <Route index element={<ManagerDashboard />} />
      </Route>

      <Route
        path="/employee"
        element={
          <Protected allowedRoles={["employee"]}>
            <DashboardShell />
          </Protected>
        }
      >
        <Route index element={<EmployeeDashboard />} />
      </Route>

      <Route
        path="/vendor"
        element={
          <Protected allowedRoles={["vendor"]}>
            <DashboardShell />
          </Protected>
        }
      >
        <Route index element={<VendorDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

