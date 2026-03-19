import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

export default function DashboardShell() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex"> 
        <div className="min-w-0 flex-1">
          <Topbar />
          <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 md:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

