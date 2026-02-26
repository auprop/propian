"use client";

const attacks = [
  { time: "14:32", type: "DDoS", src: "185.220.xxx.xxx", target: "/api/feed", status: "blocked", sev: "red", reqs: "2.4M" },
  { time: "14:28", type: "Brute Force", src: "45.134.xxx.xxx", target: "/api/auth", status: "blocked", sev: "amber", reqs: "12.8K" },
  { time: "13:45", type: "SQL Injection", src: "91.215.xxx.xxx", target: "/api/search", status: "blocked", sev: "amber", reqs: "342" },
  { time: "12:10", type: "XSS Attempt", src: "103.42.xxx.xxx", target: "/api/posts", status: "blocked", sev: "blue", reqs: "28" },
  { time: "11:58", type: "Bot Scraping", src: "Multiple IPs", target: "/api/directory", status: "rate-limited", sev: "outline", reqs: "8.4K" },
];

const rateLimits = [
  { e: "/api/auth", l: "10/min" },
  { e: "/api/posts", l: "60/min" },
  { e: "/api/search", l: "30/min" },
  { e: "/api/upload", l: "5/min" },
];

export default function AdminSecurity() {
  return (
    <div>
      <div className="pt-admin-section-header">
        <div>
          <div className="pt-admin-section-tag">ADMIN PANEL</div>
          <h2 className="pt-admin-section-title">Security Center</h2>
          <p className="pt-admin-section-subtitle">Live threat monitoring and firewall management</p>
        </div>
        <span className="pt-admin-badge red"><span className="pt-admin-dot" style={{ background: "var(--red)" }} /> LIVE</span>
      </div>

      {/* Stats */}
      <div className="pt-admin-stats">
        {[
          { label: "Threats (24h)", value: "847", change: -12 },
          { label: "DDoS (30d)", value: "23" },
          { label: "WAF Rules", value: "342" },
          { label: "Blocked IPs", value: "1,247" },
        ].map((s) => (
          <div key={s.label} className="pt-admin-stat">
            <div className="pt-admin-stat-label">{s.label}</div>
            <div className="pt-admin-stat-value">{s.value}</div>
            {s.change !== undefined && (
              <div className={`pt-admin-stat-change ${s.change >= 0 ? "positive" : "negative"}`}>
                {s.change >= 0 ? "+" : ""}{s.change}% from last month
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Attacks table */}
      <div className="pt-admin-table">
        <div className="pt-admin-table-header" style={{ gridTemplateColumns: "0.8fr 1fr 1.2fr 1fr 0.8fr 0.8fr 0.8fr" }}>
          {["Time", "Type", "Source", "Target", "Requests", "Status", ""].map((h) => (
            <div key={h} className="pt-admin-table-header-cell">{h}</div>
          ))}
        </div>
        {attacks.map((a, i) => (
          <div key={i} className="pt-admin-table-row" style={{ gridTemplateColumns: "0.8fr 1fr 1.2fr 1fr 0.8fr 0.8fr 0.8fr" }}>
            <span className="pt-admin-mono" style={{ color: "var(--g500)" }}>{a.time} UTC</span>
            <span className={`pt-admin-badge ${a.sev}`}>{a.type}</span>
            <span className="pt-admin-mono" style={{ fontSize: 12 }}>{a.src}</span>
            <span className="pt-admin-mono" style={{ fontSize: 12, color: "var(--g500)" }}>{a.target}</span>
            <span className="pt-admin-mono">{a.reqs}</span>
            <span className={`pt-admin-badge ${a.status === "blocked" ? "green" : "amber"}`}>{a.status}</span>
            <button className="pt-admin-btn" style={{ padding: "6px 6px 6px 12px", fontSize: 12 }}>
              <span>Details</span>
              <span className="pt-admin-btn-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={12} height={12}><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* Bottom 2-col */}
      <div className="pt-admin-grid-2" style={{ marginTop: 16 }}>
        <div className="pt-admin-card">
          <div className="pt-admin-card-label">Rate Limiting</div>
          {rateLimits.map((r, i) => (
            <div key={i} className="pt-admin-list-row" style={{ alignItems: "center" }}>
              <span className="pt-admin-mono" style={{ fontSize: 13 }}>{r.e}</span>
              <span className="pt-admin-badge green">{r.l}</span>
            </div>
          ))}
        </div>
        <div className="pt-admin-card danger">
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--red)", marginBottom: 6 }}>Firewall Status</div>
          <div style={{ fontSize: 13, color: "var(--red)", opacity: 0.8, marginBottom: 12 }}>
            All protection layers active. Last DDoS attack mitigated 2h ago.
          </div>
          <button className="pt-admin-btn danger">
            <span>Manage Rules</span>
            <span className="pt-admin-btn-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={14} height={14}><path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
