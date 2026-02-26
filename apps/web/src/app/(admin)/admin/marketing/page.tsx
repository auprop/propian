"use client";

import { useState } from "react";

const campaigns = [
  { name: "Welcome Series", type: "Automated", status: "active", sent: "12,840", opened: "64%", clicked: "26%" },
  { name: "Weekly Market Digest", type: "Recurring", status: "active", sent: "45,200", opened: "49%", clicked: "22%" },
  { name: "Prop Firm Deals", type: "One-time", status: "draft", sent: "—", opened: "—", clicked: "—" },
  { name: "Re-engagement Flow", type: "Automated", status: "paused", sent: "8,900", opened: "24%", clicked: "8%" },
];

const statusMap: Record<string, string> = { active: "green", draft: "outline", paused: "amber", scheduled: "blue" };
const statusDotColor: Record<string, string> = { active: "var(--green)", paused: "var(--amber)", draft: "var(--g400)" };

const segments = [
  { n: "All Users", c: "142.8K", d: "Complete user base" },
  { n: "Active Traders", c: "89.2K", d: "Logged in last 7 days" },
  { n: "Premium", c: "12.4K", d: "Active subscription" },
  { n: "Prop Firm Owners", c: "847", d: "Verified accounts" },
  { n: "Inactive 30d+", c: "18.6K", d: "No login 30+ days" },
  { n: "New Users (7d)", c: "3.2K", d: "Registered this week" },
];

const templates = [
  { n: "Welcome Email", c: "Onboarding" },
  { n: "Weekly Digest", c: "Newsletter" },
  { n: "Prop Firm Deal", c: "Promotional" },
  { n: "Account Warning", c: "Transactional" },
];

export default function AdminMarketing() {
  const [tab, setTab] = useState<"Campaigns" | "Templates" | "Segments" | "Compose">("Campaigns");

  return (
    <div>
      <div className="pt-admin-section-header">
        <div>
          <div className="pt-admin-section-tag">ADMIN PANEL</div>
          <h2 className="pt-admin-section-title">Marketing Hub</h2>
          <p className="pt-admin-section-subtitle">Email campaigns, templates, and audience segments</p>
        </div>
        <button className="pt-admin-btn primary">
          <span>New Campaign</span>
          <span className="pt-admin-btn-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={14} height={14}><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </span>
        </button>
      </div>

      {/* Stats */}
      <div className="pt-admin-stats">
        {[
          { label: "Emails Sent", value: "67.2K", change: 12.4 },
          { label: "Open Rate", value: "48.2%", change: 3.1 },
          { label: "Click Rate", value: "21.8%", change: -1.2 },
        ].map((s) => (
          <div key={s.label} className="pt-admin-stat">
            <div className="pt-admin-stat-label">{s.label}</div>
            <div className="pt-admin-stat-value">{s.value}</div>
            <div className={`pt-admin-stat-change ${s.change >= 0 ? "positive" : "negative"}`}>
              {s.change >= 0 ? "+" : ""}{s.change}% from last month
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="pt-admin-tabs">
        {(["Campaigns", "Templates", "Segments", "Compose"] as const).map((t) => (
          <button key={t} className={`pt-admin-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* Campaigns */}
      {tab === "Campaigns" && (
        <div className="pt-admin-table">
          <div className="pt-admin-table-header" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
            {["Campaign", "Type", "Status", "Sent", "Opened", "Clicked"].map((h) => (
              <div key={h} className="pt-admin-table-header-cell">{h}</div>
            ))}
          </div>
          {campaigns.map((c, i) => (
            <div key={i} className="pt-admin-table-row" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
              <span className="pt-admin-badge outline">{c.type}</span>
              <span className={`pt-admin-badge ${statusMap[c.status]}`}>
                <span className="pt-admin-dot" style={{ background: statusDotColor[c.status] ?? "var(--g400)" }} /> {c.status}
              </span>
              <span className="pt-admin-mono">{c.sent}</span>
              <span className="pt-admin-mono">{c.opened}</span>
              <span className="pt-admin-mono">{c.clicked}</span>
            </div>
          ))}
        </div>
      )}

      {/* Compose */}
      {tab === "Compose" && (
        <div className="pt-admin-card" style={{ padding: 28 }}>
          <div style={{ marginBottom: 18 }}>
            <label className="pt-admin-label">Subject Line</label>
            <input className="pt-admin-input" placeholder="Enter email subject..." />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label className="pt-admin-label">Send To</label>
            <select className="pt-admin-select">
              <option>All Users (142.8K)</option>
              <option>Active Traders (89.2K)</option>
              <option>Premium (12.4K)</option>
            </select>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label className="pt-admin-label">Body</label>
            <textarea className="pt-admin-textarea" placeholder="Compose your email..." />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="pt-admin-btn lime">
              <span>Send Now</span>
              <span className="pt-admin-btn-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={14} height={14}><path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </span>
            </button>
            <button className="pt-admin-btn ghost"><span>Schedule</span></button>
          </div>
        </div>
      )}

      {/* Segments */}
      {tab === "Segments" && (
        <div className="pt-admin-grid-3">
          {segments.map((s, i) => (
            <div key={i} className="pt-admin-card hoverable" style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{s.n}</div>
              <div className="pt-admin-mono" style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{s.c}</div>
              <div style={{ fontSize: 12, color: "var(--g400)", marginTop: 2 }}>{s.d}</div>
            </div>
          ))}
        </div>
      )}

      {/* Templates */}
      {tab === "Templates" && (
        <div className="pt-admin-grid-2">
          {templates.map((t, i) => (
            <div key={i} className="pt-admin-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700 }}>{t.n}</span>
                <span className="pt-admin-badge blue">{t.c}</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button className="pt-admin-btn" style={{ padding: "6px 6px 6px 12px", fontSize: 12 }}><span>Edit</span></button>
                <button className="pt-admin-btn" style={{ padding: "6px 6px 6px 12px", fontSize: 12 }}><span>Preview</span></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
