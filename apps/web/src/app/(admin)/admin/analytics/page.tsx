"use client";

import { useState } from "react";

/* ════════════════════════════════════════════
   PROPIAN ADMIN — Analytics & Insights
   Comprehensive dashboard for Web + App metrics
   ════════════════════════════════════════════ */

/* ─── ICONS ─── */
const I = {
  Trend: ({ s = 14, d = "up" }: { s?: number; d?: "up" | "down" }) =>
    d === "up" ? (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="22,7 13.5,15.5 8.5,10.5 2,17" /><polyline points="16,7 22,7 22,13" /></svg>
    ) : (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="22,17 13.5,8.5 8.5,13.5 2,7" /><polyline points="16,17 22,17 22,11" /></svg>
    ),
  Users: ({ s = 18 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  Eye: ({ s = 18 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  Zap: ({ s = 18 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10" /></svg>,
  Clock: ({ s = 18 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg>,
  Globe: ({ s = 18 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  Phone: ({ s = 18 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18" /></svg>,
  Msg: ({ s = 18 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  Heart: ({ s = 18 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>,
  Dollar: ({ s = 18 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  Share: ({ s = 18 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>,
  Star: ({ s = 18 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>,
  Download: ({ s = 18 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  Calendar: ({ s = 18 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
};

/* ─── SPARKLINE ─── */
function Spark({ data, color = "var(--lime)", w = 120, h = 32 }: { data: number[]; color?: string; w?: number; h?: number }) {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`${pts} ${w},${h} 0,${h}`} fill={`${color}22`} stroke="none" />
    </svg>
  );
}

/* ─── BAR CHART ─── */
function BarChart({ data, color = "var(--lime)", h = 140 }: { data: { l: string; v: number }[]; color?: string; h?: number }) {
  const max = Math.max(...data.map((d) => d.v));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: h }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ width: "100%", background: color, borderRadius: "4px 4px 0 0", height: `${(d.v / max) * (h - 20)}px`, border: "1.5px solid var(--black)", borderBottom: "none", minHeight: 4, transition: "height .3s" }} />
          <span style={{ fontSize: 9, color: "var(--g400)", fontFamily: "var(--mono)" }}>{d.l}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── DONUT ─── */
function Donut({ segments, size = 140 }: { segments: { pct: number; color: string; label: string }[]; size?: number }) {
  const r = 50, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 140 140">
      {segments.map((s, i) => {
        const dash = (s.pct / 100) * c;
        const o = offset;
        offset += dash;
        return <circle key={i} cx="70" cy="70" r={r} fill="none" stroke={s.color} strokeWidth="18" strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-o} strokeLinecap="round" transform="rotate(-90 70 70)" />;
      })}
      <text x="70" y="66" textAnchor="middle" fontSize="22" fontWeight="800" fontFamily="var(--mono)" fill="var(--black)">{segments.reduce((a, s) => a + s.pct, 0) > 0 ? segments[0].pct + "%" : ""}</text>
      <text x="70" y="82" textAnchor="middle" fontSize="10" fontWeight="600" fontFamily="var(--font)" fill="var(--g400)">{segments[0]?.label || ""}</text>
    </svg>
  );
}

/* ─── PROGRESS BAR ─── */
function PBar({ pct, color, label, value }: { pct: number; color: string; label: string; value: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--mono)" }}>{value}</span>
      </div>
      <div style={{ height: 8, background: "var(--g100)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width .5s" }} />
      </div>
    </div>
  );
}

/* ─── STAT CARD ─── */
function Stat({ label, value, change, up = true, icon: Icon, spark, sub }: {
  label: string; value: string; change?: string; up?: boolean;
  icon: React.FC<{ s?: number }>; spark?: number[]; sub?: string;
}) {
  return (
    <div className="pt-admin-card pt-admin-analytics-stat">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <div className="pt-admin-analytics-stat-icon"><Icon s={18} /></div>
        <div className="pt-admin-mono" style={{ fontWeight: 600, letterSpacing: 1 }}>{label}</div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div className="pt-admin-analytics-stat-val">{value}</div>
          {change && <div className={`pt-admin-analytics-change ${up ? "up" : "dn"}`}><I.Trend s={12} d={up ? "up" : "down"} /> {change}</div>}
          {sub && <div style={{ fontSize: 11, color: "var(--g400)", marginTop: 2 }}>{sub}</div>}
        </div>
        {spark && <Spark data={spark} />}
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [tab, setTab] = useState("overview");
  const [period, setPeriod] = useState("30d");
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const tabs = [
    { id: "overview", l: "Overview" },
    { id: "users", l: "Users & Growth" },
    { id: "engagement", l: "Engagement" },
    { id: "content", l: "Content & Chat" },
    { id: "directory", l: "Prop Directory" },
    { id: "academy", l: "Academy" },
    { id: "revenue", l: "Revenue" },
    { id: "seo", l: "SEO & Performance" },
    { id: "realtime", l: "Real-time" },
  ];

  const periods = ["24h", "7d", "30d", "90d", "1y"];

  return (
    <div>
      {/* ═══ HEADER ═══ */}
      <div className="pt-admin-analytics-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div className="pt-admin-mono" style={{ fontWeight: 600, letterSpacing: 1.5, marginBottom: 4 }}>ADMIN PANEL</div>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, margin: 0 }}>Analytics & Insights</h2>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="pt-admin-badge green"><span className="pt-admin-dot" style={{ background: "var(--green)" }} /> GA Connected</span>
            <span className="pt-admin-badge amber"><span className="pt-admin-dot" style={{ background: "var(--amber)" }} /> Firebase</span>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div className="pt-admin-analytics-periods">
                {periods.map((p) => (
                  <button key={p} className={`pt-admin-analytics-period ${period === p ? "on" : ""}`} onClick={() => { setPeriod(p); setShowCustomPicker(false); }}>{p}</button>
                ))}
                <button className={`pt-admin-analytics-period custom ${period === "custom" ? "on" : ""}`} onClick={() => setShowCustomPicker(!showCustomPicker)}><I.Calendar s={11} /></button>
              </div>
              {showCustomPicker && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 30, background: "var(--white)", borderRadius: 10, border: "2px solid var(--black)", padding: 16, boxShadow: "0 8px 24px rgba(0,0,0,.12)", minWidth: 260 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Custom Date Range</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--g400)", display: "block", marginBottom: 4 }}>From</label>
                      <input type="date" className="pt-admin-inp pt-admin-mono" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ fontSize: 12 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--g400)", display: "block", marginBottom: 4 }}>To</label>
                      <input type="date" className="pt-admin-inp pt-admin-mono" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ fontSize: 12 }} />
                    </div>
                    <button className="pt-admin-btn blk" style={{ marginTop: 4, fontSize: 12 }} onClick={() => { if (customFrom && customTo) { setPeriod("custom"); setShowCustomPicker(false); } }}>Apply</button>
                  </div>
                </div>
              )}
            </div>
            <button className="pt-admin-analytics-export"><I.Download s={14} /> Export</button>
          </div>
        </div>
        <div className="pt-admin-analytics-tabs">
          {tabs.map((t) => (
            <button key={t.id} className={`pt-admin-analytics-tab ${tab === t.id ? "on" : ""} ${t.id === "realtime" ? "live" : ""}`} onClick={() => setTab(t.id)}>{t.l}</button>
          ))}
        </div>
      </div>

      {/* ═══ BODY ═══ */}
      <div style={{ padding: "24px 0" }}>

        {/* ═══════════ OVERVIEW ═══════════ */}
        {tab === "overview" && <>
          <div className="pt-admin-analytics-grid4">
            <Stat label="PAGE VIEWS" value="334K" change="+14.2% from last month" icon={I.Eye} spark={[12, 18, 15, 22, 28, 25, 34, 30, 38, 42, 40, 48]} />
            <Stat label="SESSIONS" value="146K" change="+8.7% from last month" icon={I.Globe} spark={[8, 12, 10, 14, 16, 15, 20, 18, 22, 25, 24, 28]} />
            <Stat label="BOUNCE RATE" value="28%" change="-4.2% from last month" up={false} icon={I.Zap} spark={[38, 35, 36, 32, 30, 28, 29, 27, 26, 28, 26, 24]} />
            <Stat label="AVG SESSION" value="4:22" change="+6.1% from last month" icon={I.Clock} spark={[3, 3.2, 3.5, 3.4, 3.8, 4, 3.9, 4.1, 4.2, 4.3, 4.1, 4.4]} />
          </div>

          <div className="pt-admin-analytics-grid2">
            {/* MOBILE APP */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">MOBILE APP</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                {[{ l: "DAU", v: "42.8K" }, { l: "MAU", v: "186.2K" }, { l: "D7 RETENTION", v: "38.4%" }, { l: "CRASH RATE", v: "0.02%" }].map((s) => (
                  <div key={s.l} style={{ padding: 14, background: "var(--g50)", borderRadius: 12, border: "1.5px solid var(--g200)" }}>
                    <div className="pt-admin-mono" style={{ fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>{s.l}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--mono)", letterSpacing: -1 }}>{s.v}</div>
                  </div>
                ))}
              </div>
              <div className="pt-admin-card-label">TOP SCREENS</div>
              {([["Feed", "124.2K", "8:42"], ["Prop Directory", "68.4K", "4:18"], ["Profile", "52.1K", "3:22"], ["Chat", "41.8K", "12:04"], ["Learn", "28.6K", "6:55"]] as const).map(([n, v, t]) => (
                <div key={n} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--g100)", gap: 8 }}>
                  <span style={{ flex: 2, fontSize: 13, fontWeight: 600 }}>{n}</span>
                  <span style={{ flex: 1, fontSize: 12, fontFamily: "var(--mono)", color: "var(--g600)" }}>{v}</span>
                  <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--g400)" }}>{t}</span>
                </div>
              ))}
            </div>

            {/* TRAFFIC SOURCES + REGIONS */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">TRAFFIC SOURCES</div>
              <PBar pct={42} color="var(--green)" label="Organic Search" value="42%" />
              <PBar pct={28} color="var(--blue)" label="Direct" value="28%" />
              <PBar pct={18} color="#8b5cf6" label="Social Media" value="18%" />
              <PBar pct={8} color="var(--amber)" label="Referral" value="8%" />
              <PBar pct={4} color="var(--red)" label="Paid Ads" value="4%" />

              <div className="pt-admin-card-label" style={{ marginTop: 20 }}>TOP REGIONS</div>
              {([["US", "United States", "32%"], ["GB", "United Kingdom", "18%"], ["AE", "UAE", "12%"], ["NG", "Nigeria", "8%"], ["IN", "India", "7%"]] as const).map(([code, n, p]) => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--g100)" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--g400)", width: 22 }}>{code}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{n}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--mono)" }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </>}

        {/* ═══════════ USERS & GROWTH ═══════════ */}
        {tab === "users" && <>
          <div className="pt-admin-analytics-grid4">
            <Stat label="TOTAL USERS" value="218K" change="+12.4K this month" icon={I.Users} spark={[80, 95, 105, 120, 132, 148, 160, 172, 186, 198, 210, 218]} />
            <Stat label="NEW SIGNUPS" value="12.4K" change="+18% vs last month" icon={I.Zap} spark={[6, 7, 8, 7.5, 9, 8, 10, 9.5, 11, 10, 12, 12.4]} />
            <Stat label="DAU / MAU" value="23%" change="+2.1%" icon={I.Heart} sub="Healthy: above 20%" />
            <Stat label="CHURN RATE" value="4.8%" change="-0.6%" up={false} icon={I.Clock} sub="Improving" />
          </div>

          <div className="pt-admin-analytics-grid23">
            {/* SIGNUP FUNNEL */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">SIGNUP FUNNEL</div>
              {[
                { l: "Landing Page", v: "48,200", pct: 100 },
                { l: "Signup Started", v: "18,400", pct: 38 },
                { l: "Email Verified", v: "14,200", pct: 29 },
                { l: "Profile Complete", v: "12,400", pct: 26 },
                { l: "First Action", v: "9,800", pct: 20 },
              ].map((s, i) => (
                <div key={s.l} className="pt-admin-analytics-funnel-step">
                  <div style={{ width: 90, fontSize: 12, fontWeight: 600, color: "var(--g600)", textAlign: "right" }}>{s.l}</div>
                  <div className="pt-admin-analytics-funnel-bar" style={{ width: `${s.pct}%`, background: `rgba(168,255,57,${0.3 + (1 - i * 0.15)})` }}>{s.v}</div>
                  <div className="pt-admin-mono" style={{ fontWeight: 600 }}>{s.pct}%</div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 20, marginTop: 16 }}>
                <div style={{ fontSize: 12, color: "var(--g400)" }}>Overall conversion: <strong style={{ color: "var(--black)" }}>20.3%</strong></div>
                <div style={{ fontSize: 12, color: "var(--g400)" }}>Biggest drop: <strong style={{ color: "var(--red)" }}>Landing &rarr; Signup (62%)</strong></div>
              </div>
            </div>

            {/* USER SEGMENTS */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">USER SEGMENTS</div>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <Donut segments={[{ pct: 42, color: "#a8ff39", label: "Active" }, { pct: 28, color: "#3b82f6", label: "" }, { pct: 18, color: "#f59e0b", label: "" }, { pct: 12, color: "#e5e5e5", label: "" }]} />
              </div>
              {[
                { l: "Active Traders", v: "91.5K", pct: "42%", c: "#a8ff39" },
                { l: "Casual Browsers", v: "61K", pct: "28%", c: "#3b82f6" },
                { l: "Prop Firm Researchers", v: "39.2K", pct: "18%", c: "#f59e0b" },
                { l: "Dormant (30d+)", v: "26.2K", pct: "12%", c: "#e5e5e5" },
              ].map((s) => (
                <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--g100)" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: s.c, border: "1px solid var(--black)", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{s.l}</span>
                  <span style={{ fontSize: 12, fontFamily: "var(--mono)", fontWeight: 600 }}>{s.v}</span>
                  <span className="pt-admin-mono" style={{ fontWeight: 600, width: 30, textAlign: "right" }}>{s.pct}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-admin-analytics-grid2">
            {/* PLATFORM BREAKDOWN */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">PLATFORM BREAKDOWN</div>
              {[
                { l: "iOS App", v: "82.4K", pct: 38, c: "var(--black)" },
                { l: "Android App", v: "64.8K", pct: 30, c: "#a8ff39" },
                { l: "Web Desktop", v: "48.6K", pct: 22, c: "#3b82f6" },
                { l: "Web Mobile", v: "22.1K", pct: 10, c: "#f59e0b" },
              ].map((p) => (
                <div key={p.l} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{p.l}</span>
                    <span style={{ fontSize: 12, fontFamily: "var(--mono)" }}>{p.v} <span style={{ color: "var(--g400)" }}>({p.pct}%)</span></span>
                  </div>
                  <div style={{ height: 10, background: "var(--g100)", borderRadius: 99 }}>
                    <div style={{ height: "100%", width: `${p.pct}%`, background: p.c, borderRadius: 99, border: p.c === "var(--black)" ? "none" : "1px solid var(--black)" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* COHORT RETENTION */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">COHORT RETENTION (WEEKLY)</div>
              <div style={{ display: "grid", gridTemplateColumns: "80px repeat(8,1fr)", gap: 2, fontSize: 10, fontFamily: "var(--mono)" }}>
                <div />
                {["W0", "W1", "W2", "W3", "W4", "W5", "W6", "W7"].map((w) => <div key={w} style={{ textAlign: "center", fontWeight: 600, color: "var(--g400)", padding: 4 }}>{w}</div>)}
                {[
                  { c: "Jan 20", d: [100, 62, 48, 41, 36, 32, 30, 28] },
                  { c: "Jan 27", d: [100, 58, 44, 38, 34, 30, 28, 0] },
                  { c: "Feb 3", d: [100, 65, 52, 44, 38, 34, 0, 0] },
                  { c: "Feb 10", d: [100, 68, 55, 46, 40, 0, 0, 0] },
                  { c: "Feb 17", d: [100, 70, 58, 48, 0, 0, 0, 0] },
                ].map((r) => (
                  <div key={r.c} style={{ display: "contents" }}>
                    <div style={{ fontWeight: 600, color: "var(--g600)", display: "flex", alignItems: "center", padding: 4 }}>{r.c}</div>
                    {r.d.map((v, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}>
                        {v > 0 ? (
                          <div className="pt-admin-analytics-heat" style={{ background: `rgba(168,255,57,${v / 100})`, border: v === 100 ? "1.5px solid var(--black)" : "1px solid rgba(0,0,0,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 9 }}>{v}%</div>
                        ) : (
                          <div className="pt-admin-analytics-heat" style={{ background: "var(--g50)" }} />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>}

        {/* ═══════════ ENGAGEMENT ═══════════ */}
        {tab === "engagement" && <>
          <div className="pt-admin-analytics-grid4">
            <Stat label="ACTIONS / SESSION" value="8.4" change="+12%" icon={I.Zap} spark={[5, 5.5, 6, 6.2, 6.8, 7, 7.5, 7.8, 8, 8.2, 8.1, 8.4]} />
            <Stat label="AVG SESSION" value="6:38" change="+1:12 vs last month" icon={I.Clock} spark={[4, 4.2, 4.5, 5, 5.2, 5.5, 5.8, 6, 6.1, 6.3, 6.5, 6.6]} />
            <Stat label="SHARES / DAY" value="2.4K" change="+34%" icon={I.Share} spark={[1, 1.2, 1.4, 1.3, 1.6, 1.8, 1.7, 2, 2.1, 2.2, 2.3, 2.4]} />
            <Stat label="APP RATING" value="4.7" change="+0.2" icon={I.Star} sub="1,842 reviews" />
          </div>

          <div className="pt-admin-analytics-grid2">
            {/* FEATURE USAGE */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">FEATURE USAGE (DAILY AVG)</div>
              <BarChart data={[
                { l: "Feed", v: 82 }, { l: "Directory", v: 64 }, { l: "Chat", v: 58 }, { l: "Reviews", v: 45 },
                { l: "Compare", v: 38 }, { l: "Journal", v: 32 }, { l: "Academy", v: 28 }, { l: "Search", v: 22 },
              ]} h={160} />
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <span className="pt-admin-analytics-tag">Chat grew +42% MoM</span>
                <span className="pt-admin-analytics-tag">Directory overtook Chat</span>
              </div>
            </div>

            {/* ACTIVITY HEATMAP */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">ACTIVITY HEATMAP (HOURLY)</div>
              <div style={{ fontSize: 10, color: "var(--g400)", marginBottom: 8, fontFamily: "var(--mono)" }}>Peak: London & NY sessions overlap</div>
              <div style={{ display: "grid", gridTemplateColumns: "30px repeat(24,1fr)", gap: 2, fontSize: 9, fontFamily: "var(--mono)" }}>
                <div />
                {Array.from({ length: 24 }, (_, i) => <div key={i} style={{ textAlign: "center", color: "var(--g400)" }}>{i}</div>)}
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, di) => (
                  <div key={d} style={{ display: "contents" }}>
                    <div style={{ display: "flex", alignItems: "center", color: "var(--g400)", fontWeight: 600 }}>{d}</div>
                    {Array.from({ length: 24 }, (_, hi) => {
                      const isWeekend = di >= 5;
                      const isTrading = hi >= 7 && hi <= 21;
                      const isPeak = hi >= 13 && hi <= 17;
                      const intensity = isWeekend ? (isTrading ? 0.2 : 0.05) : (isPeak ? 0.9 : isTrading ? 0.5 : 0.1);
                      return <div key={hi} className="pt-admin-analytics-heat" style={{ background: `rgba(168,255,57,${intensity})`, border: intensity > 0.7 ? "1px solid rgba(0,0,0,.15)" : "none", borderRadius: 2 }} />;
                    })}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 12, justifyContent: "center" }}>
                <span style={{ fontSize: 10, color: "var(--g400)", display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 10, background: "rgba(168,255,57,.1)", borderRadius: 2 }} /> Low</span>
                <span style={{ fontSize: 10, color: "var(--g400)", display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 10, background: "rgba(168,255,57,.5)", borderRadius: 2 }} /> Medium</span>
                <span style={{ fontSize: 10, color: "var(--g400)", display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 10, background: "rgba(168,255,57,.9)", border: "1px solid rgba(0,0,0,.15)", borderRadius: 2 }} /> Peak</span>
              </div>
            </div>
          </div>

          <div className="pt-admin-analytics-grid3">
            {/* NOTIFICATIONS */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">PUSH NOTIFICATIONS</div>
              {([["Sent", "248K", null], ["Delivered", "231K", "93.1%"], ["Opened", "42.8K", "18.5%"], ["Clicked", "18.4K", "43.0%"]] as const).map(([l, v, r]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--g100)" }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{l}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--mono)" }}>{v}</span>
                  {r && <span style={{ fontSize: 11, color: "var(--g400)", fontFamily: "var(--mono)", marginLeft: 8, width: 42, textAlign: "right" }}>{r}</span>}
                </div>
              ))}
            </div>

            {/* SOCIAL ACTIONS */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">SOCIAL ACTIONS</div>
              {([["Likes", "84.2K", "+18%", true], ["Comments", "32.4K", "+22%", true], ["Shares", "12.8K", "+34%", true], ["Saves", "8.4K", "+8%", true], ["Reports", "342", "-12%", false]] as const).map(([l, v, c, up]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--g100)" }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{l}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--mono)" }}>{v}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: up ? "var(--green)" : "var(--red)", marginLeft: 8 }}>{c}</span>
                </div>
              ))}
            </div>

            {/* SEARCH */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">TOP SEARCHES</div>
              {([["FTMO", "4.2K"], ["funded trader", "3.8K"], ["EURUSD setup", "2.4K"], ["prop firm comparison", "2.1K"], ["drawdown rules", "1.8K"], ["payout proof", "1.6K"], ["best prop firm 2026", "1.4K"]] as const).map(([q, v], i) => (
                <div key={q} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--g100)" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--g400)", fontFamily: "var(--mono)", width: 18 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{q}</span>
                  <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--g600)" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </>}

        {/* ═══════════ CONTENT & CHAT ═══════════ */}
        {tab === "content" && <>
          <div className="pt-admin-analytics-grid4">
            <Stat label="POSTS CREATED" value="18.4K" change="+22%" icon={I.Share} spark={[8, 10, 11, 12, 13, 14, 15, 14.5, 16, 17, 17.5, 18.4]} />
            <Stat label="CHAT MESSAGES" value="342K" change="+38%" icon={I.Msg} spark={[120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 342]} />
            <Stat label="REVIEWS POSTED" value="2.8K" change="+156 this week" icon={I.Star} />
            <Stat label="MEDIA UPLOADS" value="28.4K" change="+14%" icon={I.Eye} sub="842 GB stored" />
          </div>

          <div className="pt-admin-analytics-grid2">
            {/* CHAT ANALYTICS */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">CHAT — CHANNEL ACTIVITY</div>
              {[
                ["#trade-ideas", "48.2K", "2,842", "#a8ff39"],
                ["#general", "42.1K", "4,210", "#3b82f6"],
                ["#challenge-talk", "38.4K", "1,892", "#f59e0b"],
                ["#firm-reviews", "28.6K", "1,248", "#8b5cf6"],
                ["#chart-analysis", "24.8K", "1,024", "#22c55e"],
                ["#payout-discussion", "22.1K", "842", "#ec4899"],
                ["#market-news", "18.4K", "2,480", "#06b6d4"],
                ["#introductions", "14.2K", "3,412", "#e5e5e5"],
              ].map(([ch, msgs, members, c]) => (
                <div key={ch} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--g100)" }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c, border: "1px solid var(--black)", flexShrink: 0 }} />
                  <span style={{ flex: 2, fontSize: 13, fontWeight: 600 }}>{ch}</span>
                  <span style={{ flex: 1, fontSize: 12, fontFamily: "var(--mono)", color: "var(--g600)" }}>{msgs} msgs</span>
                  <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--g400)" }}>{members} users</span>
                </div>
              ))}
            </div>

            {/* FEED ANALYTICS */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">FEED — CONTENT TYPES</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[
                  { l: "Discussions", v: "6.2K", pct: 34, c: "#a8ff39" },
                  { l: "Firm Reviews", v: "4.8K", pct: 26, c: "#22c55e" },
                  { l: "Chart Screenshots", v: "3.2K", pct: 17, c: "#3b82f6" },
                  { l: "Payout Proofs", v: "1.8K", pct: 10, c: "#f59e0b" },
                  { l: "Milestone Posts", v: "1.4K", pct: 8, c: "#8b5cf6" },
                  { l: "Other", v: "1.0K", pct: 5, c: "#e5e5e5" },
                ].map((s) => (
                  <div key={s.l} style={{ padding: 10, background: "var(--g50)", borderRadius: 10, border: "1px solid var(--g200)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: s.c, border: "1px solid rgba(0,0,0,.2)" }} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{s.l}</span>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--mono)" }}>{s.v}</span>
                    <span style={{ fontSize: 11, color: "var(--g400)", marginLeft: 4 }}>{s.pct}%</span>
                  </div>
                ))}
              </div>
              <div className="pt-admin-card-label">TOP POSTS THIS WEEK</div>
              {[
                { u: "Marcus Chen", t: "FTMO just changed their scaling plan", e: "842 likes · 124 comments" },
                { u: "Elena Vasquez", t: "My honest review after 6 months with MyFundedFX", e: "624 likes · 98 comments" },
                { u: "James Wright", t: "$12K payout from TFT — proof + timeline breakdown", e: "512 likes · 86 shares" },
              ].map((p, i) => (
                <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid var(--g100)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{p.u}</div>
                  <div style={{ fontSize: 12, color: "var(--g600)", marginTop: 2 }}>{p.t}</div>
                  <div className="pt-admin-mono" style={{ marginTop: 3 }}>{p.e}</div>
                </div>
              ))}
            </div>
          </div>
        </>}

        {/* ═══════════ PROP DIRECTORY ═══════════ */}
        {tab === "directory" && <>
          <div className="pt-admin-analytics-grid4">
            <Stat label="DIRECTORY VIEWS" value="186K" change="+28%" icon={I.Eye} spark={[60, 72, 80, 92, 100, 112, 120, 134, 148, 158, 170, 186]} />
            <Stat label="AFFILIATE CLICKS" value="24.8K" change="+42%" icon={I.Zap} spark={[8, 10, 12, 13, 14, 16, 17, 18, 20, 21, 23, 24.8]} sub="Click-through rate: 13.3%" />
            <Stat label="REVIEWS WRITTEN" value="2.8K" change="+156 this week" icon={I.Star} spark={[1, 1.2, 1.4, 1.5, 1.8, 1.9, 2, 2.2, 2.3, 2.4, 2.6, 2.8]} />
            <Stat label="COMPARISONS MADE" value="18.4K" change="+34%" icon={I.Globe} spark={[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16.5, 18.4]} />
          </div>

          <div className="pt-admin-analytics-grid23">
            {/* TOP FIRMS BY VIEWS */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">TOP FIRMS — VIEWS & CLICKS</div>
              <div className="pt-admin-analytics-thead">
                <div>FIRM</div><div>VIEWS</div><div>CLICKS</div><div>CTR</div><div>REVIEWS</div><div>RATING</div>
              </div>
              {[
                { f: "FTMO", v: "42.8K", c: "6.2K", ctr: "14.5%", r: "842", rt: "4.6" },
                { f: "The Funded Trader", v: "38.2K", c: "5.8K", ctr: "15.2%", r: "624", rt: "4.3" },
                { f: "MyFundedFX", v: "28.4K", c: "3.4K", ctr: "12.0%", r: "486", rt: "4.4" },
                { f: "Topstep", v: "22.1K", c: "2.8K", ctr: "12.7%", r: "342", rt: "4.1" },
                { f: "E8 Funding", v: "18.6K", c: "2.2K", ctr: "11.8%", r: "284", rt: "4.2" },
                { f: "Funded Next", v: "14.2K", c: "1.8K", ctr: "12.7%", r: "218", rt: "4.0" },
                { f: "Alpha Capital", v: "12.8K", c: "1.4K", ctr: "10.9%", r: "186", rt: "3.8" },
                { f: "True Forex Funds", v: "10.4K", c: "1.2K", ctr: "11.5%", r: "142", rt: "3.6" },
              ].map((firm, i) => (
                <div key={firm.f} className={`pt-admin-analytics-trow ${i === 0 ? "hl" : ""}`}>
                  <div style={{ flex: 2, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="pt-admin-mono" style={{ width: 14 }}>{i + 1}</span>
                    {firm.f}
                  </div>
                  <div style={{ flex: 1, fontSize: 12, fontFamily: "var(--mono)", color: "var(--g600)" }}>{firm.v}</div>
                  <div style={{ flex: 1, fontSize: 12, fontFamily: "var(--mono)", color: "var(--green)", fontWeight: 600 }}>{firm.c}</div>
                  <div style={{ flex: 1, fontSize: 12, fontFamily: "var(--mono)", color: "var(--g600)" }}>{firm.ctr}</div>
                  <div style={{ flex: 1, fontSize: 12, fontFamily: "var(--mono)", color: "var(--g600)" }}>{firm.r}</div>
                  <div style={{ flex: 1, fontSize: 12, fontFamily: "var(--mono)", fontWeight: 600 }}>{firm.rt}</div>
                </div>
              ))}
            </div>

            {/* AFFILIATE PERFORMANCE */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">AFFILIATE REVENUE BY FIRM</div>
              {[
                { f: "FTMO", rev: "$4,820", clicks: "6.2K", conv: "3.2%", c: "#a8ff39" },
                { f: "The Funded Trader", rev: "$3,640", clicks: "5.8K", conv: "2.8%", c: "#22c55e" },
                { f: "MyFundedFX", rev: "$1,860", clicks: "3.4K", conv: "2.4%", c: "#3b82f6" },
                { f: "Topstep", rev: "$1,240", clicks: "2.8K", conv: "2.1%", c: "#f59e0b" },
                { f: "E8 Funding", rev: "$820", clicks: "2.2K", conv: "1.8%", c: "#8b5cf6" },
                { f: "Others", rev: "$420", clicks: "4.4K", conv: "1.2%", c: "#e5e5e5" },
              ].map((a) => (
                <div key={a.f} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{a.f}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--mono)" }}>{a.rev}</span>
                  </div>
                  <div style={{ height: 8, background: "var(--g100)", borderRadius: 99, marginBottom: 3 }}>
                    <div style={{ height: "100%", width: `${(parseFloat(a.rev.replace(/[$,]/g, "")) / 4820) * 100}%`, background: a.c, borderRadius: 99, border: a.c !== "#e5e5e5" ? "1px solid var(--black)" : "none" }} />
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span className="pt-admin-mono">{a.clicks} clicks</span>
                    <span className="pt-admin-mono">{a.conv} conversion</span>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: 14, background: "rgba(168,255,57,.06)", borderRadius: 10, border: "1.5px solid #a8ff39" }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Total Affiliate Revenue</div>
                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--mono)" }}>$12,800</div>
                <div className="pt-admin-mono" style={{ color: "var(--green)", marginTop: 2 }}>+42% vs last month</div>
              </div>
            </div>
          </div>

          <div className="pt-admin-analytics-grid3">
            {/* COMPARISON TOOL */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">MOST COMPARED PAIRS</div>
              {[
                ["FTMO vs TFT", "4,842"],
                ["FTMO vs MyFundedFX", "3,216"],
                ["TFT vs E8 Funding", "2,184"],
                ["FTMO vs Topstep", "1,842"],
                ["MyFundedFX vs Funded Next", "1,428"],
              ].map(([pair, count]) => (
                <div key={pair} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--g100)" }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{pair}</span>
                  <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--g600)" }}>{count}</span>
                </div>
              ))}
            </div>

            {/* REVIEW SENTIMENT */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">REVIEW SENTIMENT</div>
              <PBar pct={62} color="var(--green)" label="Positive" value="62%" />
              <PBar pct={24} color="var(--amber)" label="Neutral" value="24%" />
              <PBar pct={14} color="var(--red)" label="Negative" value="14%" />
              <div style={{ marginTop: 12 }}>
                <div className="pt-admin-card-label">TOP PRAISE</div>
                {["Fast payouts", "Good support", "Fair rules"].map((t) => <span key={t} className="pt-admin-analytics-tag" style={{ marginRight: 6, marginBottom: 4, background: "var(--green-bg)", color: "var(--green)", borderColor: "var(--green)" }}>{t}</span>)}
                <div className="pt-admin-card-label" style={{ marginTop: 10 }}>TOP COMPLAINTS</div>
                {["Slow verification", "Hidden fees", "Strict drawdown"].map((t) => <span key={t} className="pt-admin-analytics-tag" style={{ marginRight: 6, marginBottom: 4, background: "var(--red-bg)", color: "var(--red)", borderColor: "var(--red)" }}>{t}</span>)}
              </div>
            </div>

            {/* DIRECTORY PAGES */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">TOP DIRECTORY PAGES</div>
              {[
                ["/directory", "42.8K"],
                ["/directory/ftmo", "18.4K"],
                ["/directory/the-funded-trader", "14.2K"],
                ["/compare", "18.4K"],
                ["/compare/ftmo-vs-tft", "4.8K"],
                ["/reviews/ftmo", "8.2K"],
                ["/reviews/myfundedfx", "6.4K"],
              ].map(([p, v]) => (
                <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--g100)" }}>
                  <span style={{ flex: 1, fontSize: 12, fontFamily: "var(--mono)", color: "var(--g600)" }}>{p}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--mono)" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </>}

        {/* ═══════════ ACADEMY ═══════════ */}
        {tab === "academy" && <>
          <div className="pt-admin-analytics-grid4">
            <Stat label="TOTAL ENROLLED" value="28.4K" change="+2.4K this month" icon={I.Users} spark={[12, 14, 16, 17, 19, 20, 22, 23, 24, 26, 27, 28.4]} />
            <Stat label="COURSES COMPLETED" value="8.2K" change="+18%" icon={I.Star} spark={[3, 3.5, 4, 4.2, 4.8, 5, 5.5, 6, 6.4, 7, 7.5, 8.2]} />
            <Stat label="COMPLETION RATE" value="42%" change="+4%" icon={I.Zap} sub="Industry avg: 15%" />
            <Stat label="AVG WATCH TIME" value="24 min" change="+3 min vs last month" icon={I.Clock} spark={[14, 15, 16, 17, 18, 18, 19, 20, 21, 22, 23, 24]} />
          </div>

          <div className="pt-admin-analytics-grid23">
            {/* COURSES LEADERBOARD */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">COURSES — PERFORMANCE</div>
              <div className="pt-admin-analytics-thead">
                <div>COURSE</div><div>ENROLLED</div><div>COMPLETED</div><div>RATING</div><div>AVG TIME</div>
              </div>
              {[
                { n: "Prop Firm Fundamentals", e: "12.4K", c: "6.2K", r: "4.8", t: "4.2h" },
                { n: "Risk Management Mastery", e: "8.6K", c: "3.8K", r: "4.7", t: "3.8h" },
                { n: "Understanding Drawdown Rules", e: "6.8K", c: "3.2K", r: "4.6", t: "2.4h" },
                { n: "Challenge Strategy Guide", e: "5.2K", c: "2.1K", r: "4.5", t: "5.1h" },
                { n: "Scaling Plans Explained", e: "4.8K", c: "1.8K", r: "4.4", t: "1.8h" },
                { n: "Payout Process Deep Dive", e: "3.2K", c: "1.6K", r: "4.3", t: "1.2h" },
              ].map((course, i) => (
                <div key={course.n} className={`pt-admin-analytics-trow ${i === 0 ? "hl" : ""}`}>
                  <div style={{ flex: 2, fontSize: 13, fontWeight: 600 }}>{course.n}</div>
                  <div style={{ flex: 1, fontSize: 12, fontFamily: "var(--mono)", color: "var(--g600)" }}>{course.e}</div>
                  <div style={{ flex: 1, fontSize: 12, fontFamily: "var(--mono)", color: "var(--green)" }}>{course.c}</div>
                  <div style={{ flex: 1, fontSize: 12, fontFamily: "var(--mono)" }}>{course.r}</div>
                  <div style={{ flex: 1, fontSize: 12, fontFamily: "var(--mono)", color: "var(--g400)" }}>{course.t}</div>
                </div>
              ))}
            </div>

            {/* ENGAGEMENT BREAKDOWN */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">LEARNER ENGAGEMENT</div>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <Donut segments={[{ pct: 42, color: "#a8ff39", label: "Completed" }, { pct: 28, color: "#3b82f6", label: "" }, { pct: 18, color: "#f59e0b", label: "" }, { pct: 12, color: "#e5e5e5", label: "" }]} />
              </div>
              {[
                { l: "Completed all lessons", v: "42%", c: "#a8ff39" },
                { l: "In progress (active)", v: "28%", c: "#3b82f6" },
                { l: "Started but stalled", v: "18%", c: "#f59e0b" },
                { l: "Enrolled, never started", v: "12%", c: "#e5e5e5" },
              ].map((s) => (
                <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--g100)" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: s.c, border: "1px solid var(--black)", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{s.l}</span>
                  <span style={{ fontSize: 12, fontFamily: "var(--mono)", fontWeight: 600 }}>{s.v}</span>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: 14, background: "var(--g50)", borderRadius: 10, border: "1px solid var(--g200)" }}>
                <div className="pt-admin-card-label" style={{ marginBottom: 8 }}>REVENUE FROM ACADEMY</div>
                {([["Free courses", "4 courses"], ["Pro-only courses", "8 courses"], ["Revenue this month", "$2,800"], ["Revenue all-time", "$18,400"]] as const).map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--g100)" }}>
                    <span style={{ fontSize: 12, color: "var(--g600)" }}>{l}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--mono)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-admin-analytics-grid3">
            {/* LESSON DROP-OFF */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">DROP-OFF POINTS — TOP COURSE</div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Prop Firm Fundamentals</div>
              {[
                { l: "Lesson 1: What are Prop Firms?", pct: 100 },
                { l: "Lesson 2: Evaluation Types", pct: 88 },
                { l: "Lesson 3: Rules & Restrictions", pct: 72 },
                { l: "Lesson 4: Choosing Your Firm", pct: 64 },
                { l: "Lesson 5: Your First Challenge", pct: 52 },
                { l: "Quiz: Final Assessment", pct: 48 },
              ].map((s) => (
                <div key={s.l} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 11, color: "var(--g600)" }}>{s.l}</span>
                    <span className="pt-admin-mono" style={{ fontWeight: 600 }}>{s.pct}%</span>
                  </div>
                  <div style={{ height: 6, background: "var(--g100)", borderRadius: 99 }}>
                    <div style={{ height: "100%", width: `${s.pct}%`, background: s.pct > 70 ? "#a8ff39" : s.pct > 50 ? "#f59e0b" : "#ef4444", borderRadius: 99, transition: "width .5s" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* QUIZ RESULTS */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">QUIZ PASS RATES</div>
              {([
                ["Prop Firm Fundamentals", "84%", "#22c55e"],
                ["Risk Management Mastery", "72%", "#22c55e"],
                ["Drawdown Rules", "68%", "#f59e0b"],
                ["Challenge Strategy", "62%", "#f59e0b"],
                ["Scaling Plans", "78%", "#22c55e"],
              ] as const).map(([n, p, c]) => (
                <div key={n} style={{ padding: "10px 0", borderBottom: "1px solid var(--g100)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{n}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--mono)", color: c }}>{p}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* LEARNER SOURCE */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">HOW LEARNERS FIND COURSES</div>
              <PBar pct={38} color="#a8ff39" label="In-app discovery" value="38%" />
              <PBar pct={24} color="#3b82f6" label="Directory CTA" value="24%" />
              <PBar pct={18} color="#8b5cf6" label="Chat links" value="18%" />
              <PBar pct={12} color="#f59e0b" label="Organic search" value="12%" />
              <PBar pct={8} color="#ef4444" label="Social / external" value="8%" />
            </div>
          </div>
        </>}

        {/* ═══════════ REVENUE ═══════════ */}
        {tab === "revenue" && <>
          <div className="pt-admin-analytics-grid4">
            <Stat label="MRR" value="$48.2K" change="+22% MoM" icon={I.Dollar} spark={[18, 22, 25, 28, 30, 32, 35, 38, 40, 42, 45, 48.2]} />
            <Stat label="ARR" value="$578K" change="Projected" icon={I.Dollar} sub="Based on current MRR" />
            <Stat label="ARPU" value="$2.84" change="+$0.32" icon={I.Users} spark={[1.8, 1.9, 2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.84]} />
            <Stat label="LTV" value="$42.60" change="+18%" icon={I.Heart} sub="Avg 15 month retention" />
          </div>

          <div className="pt-admin-analytics-grid23">
            {/* REVENUE BREAKDOWN */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">REVENUE STREAMS</div>
              <BarChart data={[
                { l: "Jan", v: 28 }, { l: "Feb", v: 32 }, { l: "Mar", v: 34 }, { l: "Apr", v: 36 },
                { l: "May", v: 38 }, { l: "Jun", v: 35 }, { l: "Jul", v: 38 }, { l: "Aug", v: 40 },
                { l: "Sep", v: 42 }, { l: "Oct", v: 44 }, { l: "Nov", v: 46 }, { l: "Dec", v: 48 },
              ]} h={180} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 20 }}>
                {[
                  { l: "Pro Subscriptions", v: "$28.4K", pct: 59, c: "#a8ff39" },
                  { l: "Affiliate Commissions", v: "$12.8K", pct: 27, c: "#3b82f6" },
                  { l: "Ads Revenue", v: "$4.2K", pct: 9, c: "#f59e0b" },
                  { l: "Academy Sales", v: "$2.8K", pct: 5, c: "#8b5cf6" },
                ].map((r) => (
                  <div key={r.l} style={{ padding: 12, background: "var(--g50)", borderRadius: 10, border: "1px solid var(--g200)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.c, border: "1px solid var(--black)" }} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{r.l}</span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--mono)" }}>{r.v}</div>
                    <div className="pt-admin-mono">{r.pct}% of total</div>
                  </div>
                ))}
              </div>
            </div>

            {/* SUBSCRIPTION METRICS */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">SUBSCRIPTIONS</div>
              {[
                { l: "Free", v: "184,200", pct: 84.5, c: "#e5e5e5" },
                { l: "Pro Monthly ($9.99)", v: "28,400", pct: 13, c: "#a8ff39" },
                { l: "Pro Annual ($89.99)", v: "4,800", pct: 2.2, c: "var(--black)" },
                { l: "Team ($29.99/seat)", v: "620", pct: 0.3, c: "#3b82f6" },
              ].map((s) => (
                <div key={s.l} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{s.l}</span>
                    <span style={{ fontSize: 12, fontFamily: "var(--mono)" }}>{s.v}</span>
                  </div>
                  <div style={{ height: 8, background: "var(--g100)", borderRadius: 99 }}>
                    <div style={{ height: "100%", width: `${Math.min(s.pct, 100)}%`, background: s.c, borderRadius: 99, border: s.c !== "#e5e5e5" ? "1px solid var(--black)" : "none" }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: 14, background: "var(--g50)", borderRadius: 10, border: "1px solid var(--g200)" }}>
                <div className="pt-admin-card-label" style={{ marginBottom: 8 }}>CONVERSION METRICS</div>
                {([["Free \u2192 Pro trial", "8.4%"], ["Trial \u2192 Paid", "42%"], ["Monthly \u2192 Annual", "12%"], ["Churn (Pro)", "6.2%"]] as const).map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--g100)" }}>
                    <span style={{ fontSize: 12, color: "var(--g600)" }}>{l}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--mono)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>}

        {/* ═══════════ SEO & PERFORMANCE ═══════════ */}
        {tab === "seo" && <>
          <div className="pt-admin-analytics-grid4">
            <Stat label="ORGANIC TRAFFIC" value="140K" change="+22% MoM" icon={I.Globe} spark={[48, 55, 62, 68, 75, 82, 90, 98, 108, 118, 128, 140]} sub="42% of total traffic" />
            <Stat label="INDEXED PAGES" value="12.4K" change="+842 this month" icon={I.Eye} />
            <Stat label="AVG POSITION" value="14.2" change="-2.8 (improved)" up={false} icon={I.Zap} sub="Top 20 for 2.4K keywords" />
            <Stat label="DOMAIN RATING" value="48" change="+4 this quarter" icon={I.Star} sub="Ahrefs DR" />
          </div>

          <div className="pt-admin-analytics-grid2">
            {/* CORE WEB VITALS */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">CORE WEB VITALS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { l: "LCP", sub: "Largest Contentful Paint", v: "1.2s", target: "< 2.5s", c: "#22c55e" },
                  { l: "FID", sub: "First Input Delay", v: "18ms", target: "< 100ms", c: "#22c55e" },
                  { l: "CLS", sub: "Cumulative Layout Shift", v: "0.04", target: "< 0.1", c: "#22c55e" },
                  { l: "TTFB", sub: "Time to First Byte", v: "320ms", target: "< 800ms", c: "#22c55e" },
                ].map((m) => (
                  <div key={m.l} style={{ padding: 14, background: "var(--g50)", borderRadius: 12, border: `1.5px solid ${m.c}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "var(--mono)" }}>{m.l}</span>
                      <span className="pt-admin-badge green" style={{ fontSize: 9 }}>PASS</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--g400)", marginBottom: 6 }}>{m.sub}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--mono)" }}>{m.v}</div>
                    <div className="pt-admin-mono" style={{ marginTop: 2 }}>Target: {m.target}</div>
                  </div>
                ))}
              </div>

              <div className="pt-admin-card-label" style={{ marginTop: 20 }}>PAGE SPEED SCORES</div>
              {[
                { p: "Homepage", mob: 92, desk: 98 },
                { p: "Prop Directory", mob: 88, desk: 96 },
                { p: "Firm Profile", mob: 84, desk: 94 },
                { p: "Feed", mob: 78, desk: 92 },
                { p: "Chat", mob: 72, desk: 88 },
              ].map((pg) => (
                <div key={pg.p} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--g100)" }}>
                  <span style={{ flex: 2, fontSize: 13, fontWeight: 600 }}>{pg.p}</span>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>
                    <I.Phone s={12} />
                    <span style={{ fontSize: 12, fontFamily: "var(--mono)", fontWeight: 600, color: pg.mob >= 90 ? "var(--green)" : pg.mob >= 75 ? "var(--amber)" : "var(--red)" }}>{pg.mob}</span>
                  </div>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>
                    <I.Globe s={12} />
                    <span style={{ fontSize: 12, fontFamily: "var(--mono)", fontWeight: 600, color: pg.desk >= 90 ? "var(--green)" : pg.desk >= 75 ? "var(--amber)" : "var(--red)" }}>{pg.desk}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* TOP KEYWORDS */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">TOP RANKING KEYWORDS</div>
              <div className="pt-admin-analytics-thead">
                <div>KEYWORD</div><div>POSITION</div><div>VOLUME</div><div>TRAFFIC</div><div>TREND</div>
              </div>
              {[
                { k: "best prop firms", p: 3, vol: "12.1K", tr: "4.2K", d: "up" as const },
                { k: "prop firm reviews", p: 2, vol: "8.4K", tr: "3.8K", d: "up" as const },
                { k: "FTMO review", p: 5, vol: "6.8K", tr: "1.4K", d: "up" as const },
                { k: "prop firm comparison", p: 4, vol: "4.2K", tr: "1.2K", d: "up" as const },
                { k: "funded trading accounts", p: 8, vol: "3.8K", tr: "640", d: "up" as const },
                { k: "prop firm payout proof", p: 6, vol: "2.8K", tr: "820", d: "up" as const },
                { k: "cheapest prop firm", p: 12, vol: "2.4K", tr: "380", d: "down" as const },
                { k: "prop firm rules", p: 7, vol: "2.1K", tr: "680", d: "up" as const },
                { k: "prop firm scam", p: 4, vol: "1.8K", tr: "520", d: "up" as const },
                { k: "forex funded account", p: 14, vol: "1.6K", tr: "240", d: "down" as const },
              ].map((kw) => (
                <div key={kw.k} className={`pt-admin-analytics-trow ${kw.p <= 3 ? "hl" : ""}`}>
                  <div style={{ flex: 2, fontSize: 13, fontWeight: 600 }}>{kw.k}</div>
                  <div style={{ flex: 1, fontSize: 12, fontFamily: "var(--mono)", fontWeight: 700, color: kw.p <= 3 ? "var(--green)" : kw.p <= 10 ? "var(--black)" : "var(--g400)" }}>#{kw.p}</div>
                  <div style={{ flex: 1, fontSize: 12, fontFamily: "var(--mono)", color: "var(--g600)" }}>{kw.vol}</div>
                  <div style={{ flex: 1, fontSize: 12, fontFamily: "var(--mono)", color: "var(--g600)" }}>{kw.tr}</div>
                  <div style={{ flex: 1, color: kw.d === "up" ? "var(--green)" : "var(--red)" }}><I.Trend s={14} d={kw.d} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-admin-analytics-grid3">
            {/* TOP LANDING PAGES */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">TOP ORGANIC LANDING PAGES</div>
              {[
                ["/directory", "28.4K"],
                ["/directory/ftmo", "12.8K"],
                ["/compare/ftmo-vs-tft", "8.4K"],
                ["/blog/best-prop-firms-2026", "6.2K"],
                ["/reviews/ftmo", "4.8K"],
                ["/directory/the-funded-trader", "4.2K"],
                ["/blog/prop-firm-rules-guide", "3.8K"],
              ].map(([p, v]) => (
                <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--g100)" }}>
                  <span style={{ flex: 1, fontSize: 12, fontFamily: "var(--mono)", color: "var(--g600)" }}>{p}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--mono)" }}>{v}</span>
                </div>
              ))}
            </div>

            {/* BACKLINKS */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">BACKLINK PROFILE</div>
              {([["Total Backlinks", "8,420"], ["Referring Domains", "642"], ["New this month", "+84"], ["Lost this month", "-12"]] as const).map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--g100)" }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{l}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--mono)" }}>{v}</span>
                </div>
              ))}
              <div className="pt-admin-card-label" style={{ marginTop: 14 }}>TOP REFERRING DOMAINS</div>
              {([["forexfactory.com", "DR 82", "142"], ["babypips.com", "DR 78", "86"], ["tradingview.com", "DR 92", "64"], ["myfxbook.com", "DR 68", "48"]] as const).map(([d, dr, links]) => (
                <div key={d} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--g100)" }}>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{d}</span>
                  <span className="pt-admin-mono">{dr}</span>
                  <span style={{ fontSize: 11, fontFamily: "var(--mono)", fontWeight: 600 }}>{links}</span>
                </div>
              ))}
            </div>

            {/* INDEXING STATUS */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">INDEXING STATUS</div>
              <PBar pct={94} color="#22c55e" label="Indexed" value="11,656 pages" />
              <PBar pct={4} color="#f59e0b" label="Crawled, not indexed" value="496 pages" />
              <PBar pct={2} color="#ef4444" label="Errors" value="248 pages" />
              <div style={{ marginTop: 16 }}>
                <div className="pt-admin-card-label">CRAWL ERRORS</div>
                {([["404 Not Found", "124", "#ef4444"], ["Soft 404", "62", "#f59e0b"], ["Server Error (5xx)", "8", "#ef4444"], ["Redirect Chains", "54", "#f59e0b"]] as const).map(([e, c, color]) => (
                  <div key={e} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--g100)" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                    <span style={{ flex: 1, fontSize: 12 }}>{e}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--mono)", color }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>}

        {/* ═══════════ REAL-TIME ═══════════ */}
        {tab === "realtime" && <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div className="pt-admin-analytics-live-dot" />
            <span style={{ fontSize: 14, fontWeight: 700 }}>Live — refreshes every 5 seconds</span>
            <span style={{ fontSize: 12, color: "var(--g400)" }}>Last updated: just now</span>
          </div>

          <div className="pt-admin-analytics-grid4">
            <div className="pt-admin-card" style={{ borderColor: "var(--green)" }}>
              <div className="pt-admin-mono" style={{ color: "var(--green)", fontWeight: 700, letterSpacing: 1 }}>USERS ONLINE</div>
              <div style={{ fontSize: 42, fontWeight: 800, fontFamily: "var(--mono)", letterSpacing: -2 }}>4,218</div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <span style={{ fontSize: 12 }}><strong>2,842</strong> App</span>
                <span style={{ fontSize: 12 }}><strong>1,376</strong> Web</span>
              </div>
            </div>
            <div className="pt-admin-card">
              <div className="pt-admin-mono" style={{ fontWeight: 600, letterSpacing: 1 }}>ACTIVE IN CHAT</div>
              <div style={{ fontSize: 42, fontWeight: 800, fontFamily: "var(--mono)", letterSpacing: -2 }}>842</div>
              <div style={{ fontSize: 12, color: "var(--g400)", marginTop: 8 }}>342 messages in last 5 min</div>
            </div>
            <div className="pt-admin-card">
              <div className="pt-admin-mono" style={{ fontWeight: 600, letterSpacing: 1 }}>BROWSING FEED</div>
              <div style={{ fontSize: 42, fontWeight: 800, fontFamily: "var(--mono)", letterSpacing: -2 }}>1,428</div>
              <div style={{ fontSize: 12, color: "var(--g400)", marginTop: 8 }}>86 posts created last hour</div>
            </div>
            <div className="pt-admin-card">
              <div className="pt-admin-mono" style={{ fontWeight: 600, letterSpacing: 1 }}>VIEWING DIRECTORY</div>
              <div style={{ fontSize: 42, fontWeight: 800, fontFamily: "var(--mono)", letterSpacing: -2 }}>648</div>
              <div style={{ fontSize: 12, color: "var(--g400)", marginTop: 8 }}>24 reviews submitted</div>
            </div>
          </div>

          <div className="pt-admin-analytics-grid2">
            {/* LIVE ACTIVITY FEED */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">LIVE ACTIVITY STREAM</div>
              {[
                { t: "2s ago", a: "New signup", d: "jake_m from United States", c: "#22c55e" },
                { t: "8s ago", a: "New post", d: "GBPJPY analysis shared by @elena_v in #trade-ideas", c: "#a8ff39" },
                { t: "12s ago", a: "Firm review", d: "@marcus_c reviewed FTMO — 4.5/5", c: "#f59e0b" },
                { t: "18s ago", a: "Payout proof", d: "@james_w shared $8.2K payout screenshot from TFT", c: "#3b82f6" },
                { t: "24s ago", a: "Milestone", d: "@sarah_k posted: Passed Phase 1 at MyFundedFX!", c: "#8b5cf6" },
                { t: "31s ago", a: "New signup", d: "trading_ninja from Nigeria", c: "#22c55e" },
                { t: "38s ago", a: "Pro upgrade", d: "@alex_r upgraded to Pro Monthly", c: "#a8ff39" },
                { t: "45s ago", a: "Firm comparison", d: "@david_o compared FTMO vs TFT vs MyFundedFX", c: "#06b6d4" },
              ].map((e, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--g100)" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: e.c, marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e.a}</div>
                    <div style={{ fontSize: 12, color: "var(--g600)" }}>{e.d}</div>
                  </div>
                  <span className="pt-admin-mono" style={{ flexShrink: 0 }}>{e.t}</span>
                </div>
              ))}
            </div>

            {/* LIVE PAGES */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">ACTIVE PAGES — RIGHT NOW</div>
              {[
                { p: "/feed", u: 1428, bar: 100 },
                { p: "/chat/trade-ideas", u: 342, bar: 24 },
                { p: "/directory", u: 286, bar: 20 },
                { p: "/directory/ftmo", u: 184, bar: 13 },
                { p: "/chat/general", u: 168, bar: 12 },
                { p: "/profile/*", u: 142, bar: 10 },
                { p: "/learn", u: 124, bar: 9 },
                { p: "/compare", u: 98, bar: 7 },
                { p: "/chat/firm-reviews", u: 86, bar: 6 },
                { p: "/settings", u: 42, bar: 3 },
              ].map((pg) => (
                <div key={pg.p} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                  <span style={{ width: 160, fontSize: 12, fontFamily: "var(--mono)", fontWeight: 500, color: "var(--g600)" }}>{pg.p}</span>
                  <div style={{ flex: 1, height: 6, background: "var(--g100)", borderRadius: 99 }}>
                    <div style={{ height: "100%", width: `${pg.bar}%`, background: "var(--lime)", borderRadius: 99, minWidth: 4 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--mono)", width: 40, textAlign: "right" }}>{pg.u}</span>
                </div>
              ))}
            </div>
          </div>
        </>}
      </div>
    </div>
  );
}
