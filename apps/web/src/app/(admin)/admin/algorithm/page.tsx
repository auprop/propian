"use client";

import { useMemo } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useAdminAlgoConfig, useAdminUpdateAlgoConfig } from "@propian/shared/hooks";

const weightColors: Record<string, string> = {
  weight_quality: "var(--blue)",
  weight_engagement: "#9333ea",
  weight_recency: "var(--amber)",
  weight_trust: "var(--green)",
  weight_diversity: "#f97316",
};

export default function AdminAlgorithm() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const { data: config } = useAdminAlgoConfig(supabase);
  const updateConfig = useAdminUpdateAlgoConfig(supabase);

  const weights = config?.filter((c) => c.category === "weight") ?? [];
  const signals = config?.filter((c) => c.category === "signal") ?? [];

  return (
    <div>
      <div className="pt-admin-section-header">
        <div>
          <div className="pt-admin-section-tag">ADMIN PANEL</div>
          <h2 className="pt-admin-section-title">Feed Algorithm</h2>
          <p className="pt-admin-section-subtitle">Configure how the feed ranks and prioritizes content</p>
        </div>
      </div>

      {/* Algorithm Weights */}
      <div className="pt-admin-card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Algorithm Weights</div>
        <div style={{ fontSize: 13, color: "var(--g400)", marginBottom: 20 }}>Total must equal 100%</div>
        {weights.map((w) => (
          <div key={w.id} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{w.description}</span>
              <span className="pt-admin-mono" style={{ fontWeight: 800, fontSize: 14 }}>{w.value}%</span>
            </div>
            <div className="pt-admin-progress">
              <div
                className="pt-admin-progress-bar"
                style={{ width: `${w.value}%`, background: weightColors[w.key] ?? "var(--blue)" }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Ranking Signals */}
      <div className="pt-admin-card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Ranking Signals</div>
            <div style={{ fontSize: 13, color: "var(--g400)", marginTop: 2 }}>Boost or penalize content</div>
          </div>
          <button className="pt-admin-btn">
            <span>Add Signal</span>
            <span className="pt-admin-btn-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={14} height={14}><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </span>
          </button>
        </div>
        {signals.map((s) => {
          const isPositive = parseFloat(s.value) > 0;
          const isPenalty = parseFloat(s.value) < 0;
          return (
            <div
              key={s.id}
              style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr 60px", padding: "12px 0", borderBottom: "var(--brd-l)", alignItems: "center", gap: 12 }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>{s.description}</span>
              <span className={`pt-admin-badge ${isPenalty ? "red" : "blue"}`}>
                {isPenalty ? "Penalty" : "Quality"}
              </span>
              <span className="pt-admin-mono" style={{ fontWeight: 800, color: isPositive ? "var(--green)" : "var(--red)" }}>
                {isPositive ? "+" : ""}{s.value}x
              </span>
              <div
                className={`pt-admin-toggle ${s.is_active ? "on" : "off"}`}
                onClick={() => updateConfig.mutate({ configId: s.id, updates: { is_active: !s.is_active } })}
              >
                <div className="pt-admin-toggle-knob" />
              </div>
            </div>
          );
        })}
      </div>

      {/* New User Feed Rule */}
      <div className="pt-admin-card warning" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#996600", marginBottom: 6 }}>New User Feed Rule</div>
        <div style={{ fontSize: 13, color: "#996600", opacity: 0.8, lineHeight: 1.5 }}>
          New accounts start with an empty feed. Content only appears once they follow other users or explore trending topics. This prevents spam exposure and encourages organic discovery.
        </div>
        <div style={{ marginTop: 10 }}>
          <span className="pt-admin-badge green">
            <span className="pt-admin-dot" style={{ background: "var(--green)" }} /> Active
          </span>
        </div>
      </div>
    </div>
  );
}
