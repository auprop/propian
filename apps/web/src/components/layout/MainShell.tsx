"use client";

import { useState, useCallback } from "react";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { BottomBar } from "./BottomBar";

interface CachedProfile {
  avatar_url: string | null;
  display_name: string;
  username: string;
}

interface MainShellProps {
  children: React.ReactNode;
  cachedProfile?: CachedProfile | null;
}

export function MainShell({ children, cachedProfile }: MainShellProps) {
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
      <Topbar onToggleSidebar={handleToggleSidebar} cachedProfile={cachedProfile} />
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={handleCloseMobile}
        onToggle={handleToggleSidebar}
        cachedProfile={cachedProfile}
      />
      <main className={`pt-app-content ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        {children}
      </main>
      <BottomBar />
    </div>
  );
}
