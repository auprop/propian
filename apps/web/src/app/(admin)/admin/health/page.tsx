"use client";

const services = [
  { n: "API Gateway", st: "healthy", up: "99.98%", lat: "42ms", cpu: 28, mem: 45, req: "2.4K/s" },
  { n: "Supabase DB", st: "healthy", up: "99.99%", lat: "8ms", cpu: 35, mem: 62, req: "1.8K/s" },
  { n: "Firebase Auth", st: "healthy", up: "99.97%", lat: "124ms", cpu: 12, mem: 28, req: "420/s" },
  { n: "Realtime WS", st: "warning", up: "99.84%", lat: "186ms", cpu: 72, mem: 81, req: "3.2K/s" },
  { n: "CDN (Media)", st: "healthy", up: "99.99%", lat: "18ms", cpu: 8, mem: 22, req: "5.6K/s" },
  { n: "Redis Cache", st: "healthy", up: "99.99%", lat: "2ms", cpu: 15, mem: 54, req: "8.1K/s" },
];

const incidents = [
  { t: "2h ago", m: "Realtime WS: Latency spike detected (186ms to 320ms)", s: "amber" },
  { t: "18h ago", m: "Supabase DB: Connection pool temporarily exhausted", s: "amber" },
  { t: "3d ago", m: "CDN: Cache miss rate increased during deploy", s: "blue" },
];

function ProgressBar({ value, thresholds }: { value: number; thresholds: [number, number] }) {
  const color = value > thresholds[1] ? "var(--red)" : value > thresholds[0] ? "var(--amber)" : "var(--green)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "var(--g200)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 3 }} />
      </div>
      <span className="pt-admin-mono" style={{ fontSize: 11, color: "var(--g500)", minWidth: 28 }}>{value}%</span>
    </div>
  );
}

export default function AdminHealth() {
  return (
    <div>
      <div className="pt-admin-section-header">
        <div>
          <div className="pt-admin-section-tag">ADMIN PANEL</div>
          <h2 className="pt-admin-section-title">System Health</h2>
          <p className="pt-admin-section-subtitle">Real-time infrastructure monitoring</p>
        </div>
        <span className="pt-admin-badge green"><span className="pt-admin-dot" style={{ background: "var(--green)" }} /> All Systems Operational</span>
      </div>

      {/* Stats */}
      <div className="pt-admin-stats">
        {[
          { label: "Uptime", value: "99.97%" },
          { label: "Avg Latency", value: "42ms", change: -8.2 },
          { label: "Error Rate", value: "0.02%", change: -12 },
          { label: "Connections", value: "24.8K", change: 5.4 },
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

      {/* Service table */}
      <div className="pt-admin-table">
        <div className="pt-admin-table-header" style={{ gridTemplateColumns: "1.5fr 0.8fr 0.8fr 0.8fr 1.2fr 1.2fr 0.8fr" }}>
          {["Service", "Status", "Uptime", "Latency", "CPU", "Memory", "Requests"].map((h) => (
            <div key={h} className="pt-admin-table-header-cell">{h}</div>
          ))}
        </div>
        {services.map((s, i) => (
          <div key={i} className="pt-admin-table-row" style={{ gridTemplateColumns: "1.5fr 0.8fr 0.8fr 0.8fr 1.2fr 1.2fr 0.8fr" }}>
            <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="pt-admin-dot" style={{ background: s.st === "healthy" ? "var(--green)" : "var(--amber)" }} />
              {s.n}
            </div>
            <span className={`pt-admin-badge ${s.st === "healthy" ? "green" : "amber"}`}>{s.st}</span>
            <span className="pt-admin-mono" style={{ color: "var(--green)", fontWeight: 600 }}>{s.up}</span>
            <span className="pt-admin-mono" style={{ color: parseInt(s.lat) < 50 ? "var(--green)" : parseInt(s.lat) < 150 ? "var(--amber)" : "#f97316" }}>{s.lat}</span>
            <ProgressBar value={s.cpu} thresholds={[50, 70]} />
            <ProgressBar value={s.mem} thresholds={[50, 75]} />
            <span className="pt-admin-mono">{s.req}</span>
          </div>
        ))}
      </div>

      {/* Recent Incidents */}
      <div className="pt-admin-card" style={{ marginTop: 16 }}>
        <div className="pt-admin-card-label">Recent Incidents</div>
        {incidents.map((inc, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "var(--brd-l)", alignItems: "center" }}>
            <span className={`pt-admin-badge ${inc.s}`}>{inc.s === "amber" ? "warning" : "info"}</span>
            <span style={{ fontSize: 13, color: "var(--g600)", flex: 1 }}>{inc.m}</span>
            <span className="pt-admin-mono" style={{ fontSize: 11, color: "var(--g400)" }}>{inc.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
