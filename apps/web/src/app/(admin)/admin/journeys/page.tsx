"use client";

import { useState } from "react";

const journeys = [
  {
    name: "Onboarding Flow", status: "active", triggered: 8420,
    steps: [
      { type: "trigger", label: "User Signs Up", note: "Immediate" },
      { type: "popup", label: "Welcome Modal", note: "Show welcome + profile CTA" },
      { type: "wait", label: "Wait 24h", note: "Delay" },
      { type: "popup", label: "Complete Profile", note: "Prompt bio & avatar" },
      { type: "condition", label: "Profile Complete?", note: "Branch" },
      { type: "push", label: "Follow Traders CTA", note: "Suggest top traders" },
    ],
  },
  {
    name: "Re-engagement", status: "active", triggered: 3200,
    steps: [
      { type: "trigger", label: "Inactive 7d", note: "Auto-detect" },
      { type: "push", label: "We Miss You", note: "Push with trending" },
      { type: "wait", label: "Wait 3 days", note: "Delay" },
      { type: "popup", label: "What's New", note: "New features modal" },
    ],
  },
  {
    name: "Prop Firm Promo", status: "draft", triggered: 0,
    steps: [
      { type: "trigger", label: "Views Directory", note: "Page visit" },
      { type: "wait", label: "Wait 30min", note: "Delay" },
      { type: "popup", label: "Exclusive Deal", note: "Discount banner" },
    ],
  },
];

const typeColors: Record<string, string> = {
  trigger: "var(--blue)", popup: "#9333ea", wait: "var(--amber)", condition: "#f97316", push: "var(--green)",
};

export default function AdminJourneys() {
  const [sel, setSel] = useState(0);
  const j = journeys[sel];

  return (
    <div>
      <div className="pt-admin-section-header">
        <div>
          <div className="pt-admin-section-tag">ADMIN PANEL</div>
          <h2 className="pt-admin-section-title">Notification Journeys</h2>
          <p className="pt-admin-section-subtitle">Build automated popup & push notification flows</p>
        </div>
      </div>

      {/* Stats */}
      <div className="pt-admin-stats">
        <div className="pt-admin-stat">
          <div className="pt-admin-stat-label">Active Journeys</div>
          <div className="pt-admin-stat-value">4</div>
        </div>
        <div className="pt-admin-stat">
          <div className="pt-admin-stat-label">Users In Journey</div>
          <div className="pt-admin-stat-value">11.6K</div>
          <div className="pt-admin-stat-change positive">+8.2% from last month</div>
        </div>
        <div className="pt-admin-stat">
          <div className="pt-admin-stat-label">Completion Rate</div>
          <div className="pt-admin-stat-value">72.8%</div>
          <div className="pt-admin-stat-change positive">+4.5% from last month</div>
        </div>
      </div>

      {/* 2-col: journey list + detail */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
        {/* Journey list */}
        <div className="pt-admin-card" style={{ padding: 12 }}>
          <div className="pt-admin-card-label" style={{ padding: "0 8px" }}>Journeys</div>
          {journeys.map((jr, i) => (
            <div
              key={i}
              onClick={() => setSel(i)}
              style={{
                padding: "12px 14px", borderRadius: "var(--r-sm)", cursor: "pointer", marginBottom: 4,
                background: sel === i ? "var(--black)" : "transparent",
                color: sel === i ? "var(--lime)" : "var(--black)",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{jr.name}</span>
                <span className={`pt-admin-badge ${jr.status === "active" ? "green" : "outline"}`}>{jr.status}</span>
              </div>
              <div className="pt-admin-mono" style={{ fontSize: 11, color: sel === i ? "var(--g500)" : "var(--g400)", marginTop: 4 }}>
                {jr.steps.length} steps &middot; {jr.triggered.toLocaleString()} triggered
              </div>
            </div>
          ))}
          <div style={{ padding: 12, border: "2px dashed var(--g300)", borderRadius: "var(--r-sm)", textAlign: "center", marginTop: 8, cursor: "pointer", color: "var(--g400)", fontSize: 12, fontWeight: 600 }}>
            + New Journey
          </div>
        </div>

        {/* Journey detail */}
        <div className="pt-admin-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{j.name}</h3>
              <div className="pt-admin-mono" style={{ fontSize: 12, color: "var(--g400)", marginTop: 2 }}>
                {j.triggered.toLocaleString()} triggered
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className={`pt-admin-btn ${j.status === "active" ? "danger" : "lime"}`}>
                <span>{j.status === "active" ? "Pause" : "Activate"}</span>
              </button>
              <button className="pt-admin-btn"><span>Edit</span></button>
            </div>
          </div>

          {/* Steps */}
          {j.steps.map((step, i) => (
            <div key={i} className="pt-admin-step">
              <div className="pt-admin-step-connector">
                <div
                  className="pt-admin-step-number"
                  style={{ background: `${typeColors[step.type]}18`, border: `2px solid ${typeColors[step.type]}`, color: typeColors[step.type] }}
                >
                  {i + 1}
                </div>
                {i < j.steps.length - 1 && <div className="pt-admin-step-line" />}
              </div>
              <div style={{ flex: 1, paddingBottom: i < j.steps.length - 1 ? 12 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{step.label}</span>
                  <span className={`pt-admin-badge ${step.type === "trigger" ? "blue" : step.type === "push" ? "green" : step.type === "condition" ? "amber" : "outline"}`}>
                    {step.type}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--g500)", marginTop: 2 }}>{step.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
