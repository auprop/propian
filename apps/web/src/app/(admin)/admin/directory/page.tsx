"use client";

import { useMemo } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useAdminFirms, useAdminUpdateFirm } from "@propian/shared/hooks";

const LOGO_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AdminDirectory() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const { data: firms } = useAdminFirms(supabase);
  const updateFirm = useAdminUpdateFirm(supabase);

  const listedCount = firms?.length ?? 0;
  const verifiedCount = firms?.filter((f: any) => f.is_verified).length ?? 0;
  const totalReviews = firms?.reduce((sum: number, f: any) => sum + (f.review_count ?? 0), 0) ?? 0;
  const avgRating =
    firms && firms.length > 0
      ? (firms.reduce((sum: number, f: any) => sum + (Number(f.rating_avg) || 0), 0) / firms.length).toFixed(1)
      : "—";

  const statCards = [
    { label: "Listed Firms", value: listedCount.toString() },
    { label: "Verified", value: verifiedCount.toString() },
    { label: "Reviews", value: totalReviews.toLocaleString() },
    { label: "Avg Rating", value: avgRating },
  ];

  function handleToggleVerified(firmId: string, currentValue: boolean) {
    updateFirm.mutate({ firmId, updates: { is_verified: !currentValue } });
  }

  function handleToggleFeatured(firmId: string, currentValue: boolean) {
    updateFirm.mutate({ firmId, updates: { is_featured: !currentValue } });
  }

  return (
    <div>
      {/* Section Header */}
      <div className="pt-admin-section-header">
        <div>
          <div className="pt-admin-section-tag">ADMIN PANEL</div>
          <h2 className="pt-admin-section-title">Prop Firm Directory</h2>
          <p className="pt-admin-section-subtitle">
            Manage listed firms, verification, and review moderation
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="pt-admin-stats">
        {statCards.map((s) => (
          <div key={s.label} className="pt-admin-stat">
            <div className="pt-admin-stat-header">
              <div>
                <div className="pt-admin-stat-label">{s.label}</div>
                <div className="pt-admin-stat-value">{s.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Firm Rows */}
      {firms?.map((firm: any, i: number) => {
        const color = firm.logo_color || LOGO_COLORS[i % LOGO_COLORS.length];
        const initials = firm.logo_text || getInitials(firm.name);
        const isVerified = !!firm.is_verified;
        const isFeatured = !!firm.is_featured;
        const isActive = firm.is_active !== false;
        const rating = Number(firm.rating_avg) || 0;

        return (
          <div key={firm.id} className="pt-admin-firm-row">
            {/* Logo */}
            <div
              className="pt-admin-firm-logo"
              style={{ background: color }}
            >
              {initials}
            </div>

            {/* Name + badges */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{firm.name}</span>
                {isVerified && (
                  <span className="pt-admin-badge green">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={12} height={12}><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                    Verified
                  </span>
                )}
                {isFeatured && (
                  <span className="pt-admin-badge lime">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={12} height={12}><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                    Featured
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                {/* Rating */}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={14} height={14}><path fill="#f59e0b" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                  <span className="pt-admin-mono" style={{ fontWeight: 600 }}>
                    {rating.toFixed(1)}
                  </span>
                </span>
                {/* Review count */}
                <span style={{ fontSize: 13, color: "var(--g500)" }}>
                  {firm.review_count ?? 0} reviews
                </span>
                {/* Status badge */}
                {isActive ? (
                  <span className="pt-admin-badge green">Active</span>
                ) : (
                  <span className="pt-admin-badge amber">Pending</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <button
                className={`pt-admin-btn ${isVerified ? "primary" : "ghost"}`}
                style={{ padding: "6px 6px 6px 12px", fontSize: 12 }}
                onClick={() => handleToggleVerified(firm.id, isVerified)}
              >
                <span>{isVerified ? "Unverify" : "Verify"}</span>
                <span className="pt-admin-btn-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={12} height={12}><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                </span>
              </button>
              <button
                className={`pt-admin-btn ${isFeatured ? "lime" : "ghost"}`}
                style={{ padding: "6px 6px 6px 12px", fontSize: 12 }}
                onClick={() => handleToggleFeatured(firm.id, isFeatured)}
              >
                <span>{isFeatured ? "Unfeature" : "Feature"}</span>
                <span className="pt-admin-btn-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={12} height={12}><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                </span>
              </button>
              <button
                className="pt-admin-btn"
                style={{ padding: "6px 6px 6px 12px", fontSize: 12 }}
              >
                <span>Edit</span>
                <span className="pt-admin-btn-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={12} height={12}><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                </span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
