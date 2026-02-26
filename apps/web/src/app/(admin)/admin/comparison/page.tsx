"use client";

import { useMemo } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useAdminComparisonFeatures, useAdminToggleComparisonFeature } from "@propian/shared/hooks";

export default function AdminComparison() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const { data: features } = useAdminComparisonFeatures(supabase);
  const toggleFeature = useAdminToggleComparisonFeature(supabase);

  return (
    <div>
      <div className="pt-admin-section-header">
        <div>
          <div className="pt-admin-section-tag">ADMIN PANEL</div>
          <h2 className="pt-admin-section-title">Prop Comparison Config</h2>
          <p className="pt-admin-section-subtitle">Configure comparison table features and presets</p>
        </div>
        <button className="pt-admin-btn primary">
          <span>Add Feature</span>
          <span className="pt-admin-btn-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={14} height={14}><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </span>
        </button>
      </div>

      <div className="pt-admin-table">
        <div className="pt-admin-table-header" style={{ gridTemplateColumns: "2fr 1fr 80px 60px" }}>
          <div className="pt-admin-table-header-cell">Feature</div>
          <div className="pt-admin-table-header-cell">Type</div>
          <div className="pt-admin-table-header-cell">Active</div>
          <div className="pt-admin-table-header-cell"></div>
        </div>
        {features?.map((f) => (
          <div
            key={f.id}
            className="pt-admin-table-row"
            style={{ gridTemplateColumns: "2fr 1fr 80px 60px", opacity: f.is_active ? 1 : 0.5 }}
          >
            <span style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</span>
            <span className="pt-admin-badge blue">{f.type}</span>
            <div
              className={`pt-admin-toggle ${f.is_active ? "on" : "off"}`}
              onClick={() => toggleFeature.mutate({ featureId: f.id, active: !f.is_active })}
            >
              <div className="pt-admin-toggle-knob" />
            </div>
            <button className="pt-admin-btn" style={{ padding: "6px 6px 6px 12px", fontSize: 12 }}>
              <span>Edit</span>
              <span className="pt-admin-btn-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={12} height={12}><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
