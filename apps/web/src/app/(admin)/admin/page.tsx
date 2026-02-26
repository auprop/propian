"use client";

import { useMemo } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useAdminStats } from "@propian/shared/hooks";

export default function AdminOverview() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const { data: stats } = useAdminStats(supabase);

  const statCards = [
    { label: "Total Users", value: stats ? `${(stats.totalUsers / 1000).toFixed(1)}K` : "—", change: 8.2 },
    { label: "Total Posts", value: stats ? stats.totalPosts.toLocaleString() : "—", change: 5.4 },
    { label: "Total Firms", value: stats?.totalFirms.toString() ?? "—" },
    { label: "Pending Reports", value: stats?.pendingReports.toString() ?? "—" },
  ];

  const systemItems = [
    { n: "API Gateway", c: "var(--green)" },
    { n: "Database", c: "var(--green)" },
    { n: "Realtime WS", c: "var(--amber)" },
    { n: "CDN", c: "var(--green)" },
    { n: "Auth Service", c: "var(--green)" },
  ];

  const securityItems = [
    { n: "Threats Blocked", v: "847" },
    { n: "WAF Rules", v: "342" },
    { n: "DDoS Attempts", v: "3" },
    { n: "Suspicious Logins", v: "28" },
  ];

  const modItems = [
    { n: "Pending Reports", v: stats?.pendingReports.toString() ?? "—" },
    { n: "Auto-Blocked", v: "124" },
    { n: "Avg Resolution", v: "14m" },
    { n: "Escalated", v: "3" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="pt-admin-section-header">
        <div>
          <div className="pt-admin-section-tag">ADMIN PANEL</div>
          <h2 className="pt-admin-section-title">Dashboard Overview</h2>
          <p className="pt-admin-section-subtitle">Propian platform health at a glance</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="pt-admin-stats">
        {statCards.map((s) => (
          <div key={s.label} className="pt-admin-stat">
            <div className="pt-admin-stat-header">
              <div>
                <div className="pt-admin-stat-label">{s.label}</div>
                <div className="pt-admin-stat-value">{s.value}</div>
              </div>
            </div>
            {s.change !== undefined && (
              <div className={`pt-admin-stat-change ${s.change >= 0 ? "positive" : "negative"}`}>
                {s.change >= 0 ? "+" : ""}{s.change}% from last month
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 3-column grid */}
      <div className="pt-admin-grid-3">
        {/* System Status */}
        <div className="pt-admin-card">
          <div className="pt-admin-card-label">System Status</div>
          {systemItems.map((item, j) => (
            <div key={j} className="pt-admin-list-row" style={{ alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{item.n}</span>
              <span className="pt-admin-dot" style={{ background: item.c }} />
            </div>
          ))}
        </div>

        {/* Security */}
        <div className="pt-admin-card">
          <div className="pt-admin-card-label">Security (24h)</div>
          {securityItems.map((item, j) => (
            <div key={j} className="pt-admin-list-row" style={{ alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{item.n}</span>
              <span className="pt-admin-mono" style={{ fontWeight: 700 }}>{item.v}</span>
            </div>
          ))}
        </div>

        {/* Moderation Queue */}
        <div className="pt-admin-card">
          <div className="pt-admin-card-label">Moderation Queue</div>
          {modItems.map((item, j) => (
            <div key={j} className="pt-admin-list-row" style={{ alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{item.n}</span>
              <span className="pt-admin-mono" style={{ fontWeight: 700 }}>{item.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
