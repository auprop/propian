"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useSession, useCurrentProfile } from "@propian/shared/hooks";
import { createBrowserClient } from "@/lib/supabase/client";
import type { AdminNavSection } from "@propian/shared/types";

/* ─── Icons (matching Propian DS filled style, 20px default) ─── */

const icons: Record<AdminNavSection, (props: { size?: number }) => React.ReactNode> = {
  overview: ({ size = 20 }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}><path fill="currentColor" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>,
  marketing: ({ size = 20 }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}><path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>,
  journeys: ({ size = 20 }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}><path fill="currentColor" d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>,
  analytics: ({ size = 20 }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}><path fill="currentColor" d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/></svg>,
  health: ({ size = 20 }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}><path fill="currentColor" d="M20 13H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1zM7 19c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm13-8H4c-.55 0-1 .45-1 1v.55C3.22 12.36 3.59 12 4 12h16c.41 0 .78.36 1 .55V6c0-.55-.45-1-1-1zM7 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>,
  security: ({ size = 20 }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}><path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>,
  academy: ({ size = 20 }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}><path fill="currentColor" d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>,
  directory: ({ size = 20 }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}><path fill="currentColor" d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>,
  comparison: ({ size = 20 }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}><path fill="currentColor" d="M10 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h5v2h2V1h-2v2zm0 15H5l5-6v6zm9-15h-5v2h5v13l-5-6v9h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>,
  users: ({ size = 20 }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}><path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
  algorithm: ({ size = 20 }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>,
  moderation: ({ size = 20 }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}><path fill="currentColor" d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>,
};

/* ─── Grouped navigation ─── */

interface SidebarGroup {
  label: string;
  abbr: string;
  items: { id: AdminNavSection; label: string }[];
}

const GROUPS: SidebarGroup[] = [
  {
    label: "Dashboard",
    abbr: "DSH",
    items: [
      { id: "overview", label: "Overview" },
      { id: "analytics", label: "Analytics" },
      { id: "health", label: "System Health" },
    ],
  },
  {
    label: "Marketing",
    abbr: "MKT",
    items: [
      { id: "marketing", label: "Marketing Hub" },
      { id: "journeys", label: "Journeys" },
    ],
  },
  {
    label: "Platform",
    abbr: "PLT",
    items: [
      { id: "academy", label: "Academy" },
      { id: "directory", label: "Prop Directory" },
      { id: "comparison", label: "Comparison" },
      { id: "algorithm", label: "Algorithm" },
    ],
  },
  {
    label: "Management",
    abbr: "MGT",
    items: [
      { id: "users", label: "Users" },
      { id: "security", label: "Security" },
      { id: "moderation", label: "Moderation" },
    ],
  },
];

const hrefMap: Record<AdminNavSection, string> = {
  overview: "/admin",
  marketing: "/admin/marketing",
  journeys: "/admin/journeys",
  analytics: "/admin/analytics",
  health: "/admin/health",
  security: "/admin/security",
  academy: "/admin/academy",
  directory: "/admin/directory",
  comparison: "/admin/comparison",
  users: "/admin/users",
  algorithm: "/admin/algorithm",
  moderation: "/admin/moderation",
};

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();
  const supabase = useMemo(() => createBrowserClient(), []);
  const { data: session } = useSession(supabase);
  const { data: profile } = useCurrentProfile(supabase, session?.user?.id);

  const isActive = (id: AdminNavSection) => {
    const href = hrefMap[id];
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div className={`pt-admin-sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Header */}
      <div
        className="pt-admin-sidebar-header"
        onClick={collapsed ? onToggle : undefined}
      >
        <div className="pt-admin-brand">
          {!collapsed ? (
            <>
              <span className="pt-admin-brand-text">PROP</span>
              <span className="pt-admin-brand-highlight">IAN</span>
            </>
          ) : (
            <span className="pt-admin-brand-collapsed">P</span>
          )}
        </div>
        {!collapsed && (
          <div className="pt-admin-sidebar-header-info">
            <span className="pt-admin-sidebar-header-label">Admin Console</span>
          </div>
        )}
        <button
          className="pt-admin-sidebar-toggle"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? (
              <polyline points="9 18 15 12 9 6" />
            ) : (
              <polyline points="15 18 9 12 15 6" />
            )}
          </svg>
        </button>
      </div>

      {/* Scrollable grouped nav */}
      <div className="pt-admin-sidebar-scroll">
        {GROUPS.map((group) => (
          <div key={group.label} className="pt-admin-sidebar-group">
            <div className="pt-admin-sidebar-group-label">
              {collapsed ? group.abbr : group.label}
            </div>
            {group.items.map((item) => {
              const Icon = icons[item.id];
              const active = isActive(item.id);
              return (
                <Link
                  key={item.id}
                  href={hrefMap[item.id]}
                  className={`pt-admin-sidebar-link ${active ? "active" : ""}`}
                >
                  <span className="pt-admin-sidebar-icon">
                    <Icon size={20} />
                  </span>
                  <span className="pt-admin-sidebar-link-text">{item.label}</span>
                  <span className="pt-admin-sidebar-tooltip">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer / User */}
      <div className="pt-admin-sidebar-footer">
        <div className="pt-admin-sidebar-user-avatar">
          {profile?.display_name?.[0]?.toUpperCase() ?? "A"}
        </div>
        <div className="pt-admin-sidebar-user-info">
          <div className="pt-admin-sidebar-user-name">
            {profile?.display_name ?? "Admin"}
          </div>
          <div className="pt-admin-sidebar-user-role">Super Admin</div>
        </div>
      </div>
    </div>
  );
}
