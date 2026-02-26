"use client";

import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="pt-admin">
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className={`pt-admin-main ${collapsed ? "sidebar-collapsed" : ""}`}>
        {/* Topbar */}
        <div className="pt-admin-topbar">
          <div className="pt-admin-topbar-label">ADMIN DASHBOARD</div>
          <div className="pt-admin-topbar-badges">
            <span className="pt-admin-badge green">
              <span className="pt-admin-dot" style={{ background: "var(--green)" }} />
              All Systems
            </span>
            <span className="pt-admin-badge dark">v2.4.1</span>
          </div>
        </div>

        {/* Content */}
        <div className="pt-admin-content">{children}</div>
      </div>
    </div>
  );
}
