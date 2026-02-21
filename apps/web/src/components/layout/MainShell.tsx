"use client";

import { useState, useCallback } from "react";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { BottomBar } from "./BottomBar";

export function MainShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggleSidebar = useCallback(() => {
    // On mobile, toggle the overlay drawer
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setMobileOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  }, []);

  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <div className="pt-app-layout">
      <Topbar onToggleSidebar={handleToggleSidebar} />
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={handleCloseMobile}
        onToggle={handleToggleSidebar}
      />
      <main className={`pt-app-content ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        {children}
      </main>
      <BottomBar />
    </div>
  );
}
