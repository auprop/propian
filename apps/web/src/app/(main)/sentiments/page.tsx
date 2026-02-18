"use client";

import { useState, useMemo } from "react";
import {
  useSentiments,
  useSentimentHero,
  useSentimentHistory,
} from "@propian/shared/hooks";
import {
  computeMovers,
  computeExtremes,
  computeDivergences,
} from "@propian/shared/api";
import type {
  SentimentData,
  SentimentHistory,
  AssetClass,
  HistoryPeriod,
} from "@propian/shared/types";
import {
  INSTRUMENT_META,
  allInstruments,
  type Instrument,
} from "@propian/shared/constants";
import { createBrowserClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

/* ─── Constants ─── */

type Tab = "overview" | "heatmap" | "history";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "heatmap", label: "Heatmap" },
  { key: "history", label: "History" },
];

const ASSET_TABS: { key: AssetClass; label: string }[] = [
  { key: "forex", label: "Forex" },
  { key: "crypto", label: "Crypto" },
  { key: "indices", label: "Indices" },
  { key: "commodities", label: "Commodities" },
];

const PERIOD_TABS = ["LIVE", "1H", "4H", "1D"] as const;
const HISTORY_PERIODS: HistoryPeriod[] = ["1D", "1W", "1M", "3M"];

// Symbols available for history dropdown
const HISTORY_SYMBOLS = allInstruments.slice(0, 12);

/* ─── SVG Gauge ─── */

function SentimentGauge({ longPct }: { longPct: number }) {
  const short = 100 - longPct;
  const needleAngle = Math.PI * (1 - longPct / 100);
  const nx = 50 + 32 * Math.cos(needleAngle);
  const ny = 50 - 32 * Math.sin(needleAngle);

  return (
    <div style={{ position: "relative", width: 100, height: 54, margin: "0 auto 8px" }}>
      <svg viewBox="0 0 100 54" style={{ width: 100, height: 54 }}>
        {/* Background arc */}
        <path
          d="M 5 50 A 45 45 0 0 1 95 50"
          fill="none"
          stroke="var(--g100)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Long portion (green) — from left */}
        <path
          d="M 5 50 A 45 45 0 0 1 95 50"
          fill="none"
          stroke="#65a30d"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${longPct * 1.41} 200`}
        />
        {/* Short portion (red) — from right */}
        <path
          d="M 95 50 A 45 45 0 0 0 5 50"
          fill="none"
          stroke="var(--red)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${short * 1.41} 200`}
        />
        {/* Needle */}
        <line
          x1="50" y1="50" x2={nx} y2={ny}
          stroke="var(--black)" strokeWidth="2" strokeLinecap="round"
        />
        <circle cx="50" cy="50" r="4" fill="var(--black)" />
      </svg>
    </div>
  );
}

/* ─── Sentiment Card ─── */

function SentimentCard({ s }: { s: SentimentData }) {
  const meta = INSTRUMENT_META[s.symbol as Instrument] ?? { label: s.symbol.slice(0, 2), color: "#888" };

  return (
    <div className="pt-sent-card">
      <div className="pt-sent-pair">
        <div className="pt-sent-pair-icon" style={{ background: meta.color }}>
          {meta.label}
        </div>
        <div>
          <div className="pt-sent-pair-name">{s.symbol}</div>
          <div className="pt-sent-pair-price">
            {s.price}{" "}
            <span
              style={{
                color: s.price_change_up ? "var(--lime-dim)" : "var(--red)",
                fontWeight: 700,
              }}
            >
              {s.price_change}
            </span>
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "var(--g400)" }}>{s.positions} positions</div>
        </div>
      </div>

      <SentimentGauge longPct={s.long_pct} />

      <div className="pt-sent-bar">
        <div className="pt-sent-bar-long" style={{ width: `${s.long_pct}%` }} />
        <div className="pt-sent-bar-short" style={{ width: `${s.short_pct}%` }} />
      </div>
      <div className="pt-sent-bar-labels">
        <span style={{ color: "var(--lime-dim)" }}>{Math.round(s.long_pct)}% Long</span>
        <span style={{ color: "var(--red)" }}>{Math.round(s.short_pct)}% Short</span>
      </div>
    </div>
  );
}

/* ─── Heatmap Cell ─── */

function getHeatBg(longPct: number): string {
  const intensity = Math.abs(longPct - 50) / 50;
  if (longPct > 65) return `rgba(101,163,13,${0.15 + intensity * 0.4})`;
  if (longPct > 55) return `rgba(101,163,13,${0.05 + intensity * 0.2})`;
  if (longPct > 45) return "var(--g50)";
  if (longPct > 35) return `rgba(255,68,68,${0.05 + intensity * 0.2})`;
  return `rgba(255,68,68,${0.15 + intensity * 0.4})`;
}

function HeatCell({ s }: { s: SentimentData }) {
  const isLong = s.long_pct >= 50;
  const dominant = isLong ? Math.round(s.long_pct) : Math.round(s.short_pct);
  const color = isLong ? "var(--lime-dim)" : "var(--red)";

  return (
    <div className="pt-sent-heat-cell" style={{ background: getHeatBg(s.long_pct) }}>
      <div className="pt-sent-heat-sym">{s.symbol}</div>
      <div className="pt-sent-heat-pct" style={{ color }}>{dominant}%</div>
      <div className="pt-sent-heat-dir" style={{ color }}>{isLong ? "Long" : "Short"}</div>
    </div>
  );
}

/* ─── History Chart (SVG area) ─── */

function HistoryChart({ data }: { data: SentimentHistory[] }) {
  if (!data.length) return null;

  const W = 500;
  const H = 180;
  const pad = 5;

  // Build points
  const step = data.length > 1 ? (W - 2 * pad) / (data.length - 1) : 0;
  const longPoints = data.map((d, i) => ({
    x: pad + i * step,
    y: H - ((d.long_pct / 100) * H),
  }));
  const shortPoints = data.map((d, i) => ({
    x: pad + i * step,
    y: H - ((d.short_pct / 100) * H),
  }));

  // Long area path
  const longPath =
    longPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") +
    ` L${W - pad},${H} L${pad},${H} Z`;

  // Short area path (from bottom)
  const shortPath =
    shortPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") +
    ` L${W - pad},${H} L${pad},${H} Z`;

  // Long line path
  const longLine = longPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  // Date labels (first, middle, last)
  const labels: { x: number; text: string }[] = [];
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours()}:00`;
  };
  if (data.length > 0) labels.push({ x: pad, text: fmt(data[0].snapshot_at) });
  if (data.length > 2) {
    const mid = Math.floor(data.length / 2);
    labels.push({ x: pad + mid * step, text: fmt(data[mid].snapshot_at) });
  }
  if (data.length > 1) {
    labels.push({ x: W - pad, text: fmt(data[data.length - 1].snapshot_at) });
  }

  return (
    <div
      style={{
        height: 180,
        background: "var(--g50)",
        borderRadius: "var(--r-md)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 50% line */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: 1,
          borderTop: "1px dashed var(--g300)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 8,
          fontSize: 9,
          color: "var(--g400)",
          transform: "translateY(-50%)",
        }}
      >
        50%
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "100%" }}
        preserveAspectRatio="none"
      >
        <path d={longPath} fill="rgba(101,163,13,.12)" />
        <path d={longLine} fill="none" stroke="#65a30d" strokeWidth="2" />
        <path d={shortPath} fill="rgba(255,68,68,.08)" />
      </svg>

      {/* Date labels */}
      <div
        style={{
          position: "absolute",
          bottom: 4,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-between",
          padding: "0 30px",
          fontSize: 9,
          color: "var(--g400)",
        }}
      >
        {labels.map((l) => (
          <span key={l.text}>{l.text}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── Loading Skeleton ─── */

function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width="100%" height={100} borderRadius={16} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={`c-${i}`} width="100%" height={220} borderRadius={12} />
        ))}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

export default function SentimentsPage() {
  const supabase = useMemo(() => createBrowserClient(), []);

  // State
  const [tab, setTab] = useState<Tab>("overview");
  const [assetClass, setAssetClass] = useState<AssetClass | undefined>(undefined);
  const [period, setPeriod] = useState("LIVE");
  const [historySymbol, setHistorySymbol] = useState<string>("XAUUSD");
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>("1W");

  // Data
  const { data: sentiments, isLoading } = useSentiments(supabase, assetClass);
  const { data: hero } = useSentimentHero(supabase);
  const { data: allSentiments } = useSentiments(supabase); // Unfiltered for movers/extremes
  const { data: allHistory } = useSentimentHistory(supabase, historySymbol, 24);
  const { data: history } = useSentimentHistory(supabase, historySymbol, 24);

  // Derived
  const movers = useMemo(
    () => (allSentiments && allHistory ? computeMovers(allSentiments, allHistory) : { bulls: [], bears: [] }),
    [allSentiments, allHistory],
  );
  const extremes = useMemo(
    () => (allSentiments ? computeExtremes(allSentiments) : []),
    [allSentiments],
  );
  const divergences = useMemo(
    () => (allSentiments ? computeDivergences(allSentiments) : []),
    [allSentiments],
  );

  // History stats
  const historyStats = useMemo(() => {
    if (!history?.length) return null;
    const current = history[history.length - 1];
    const avg = Math.round(history.reduce((s, h) => s + h.long_pct, 0) / history.length);
    const trend = Math.round(current.long_pct - history[0].long_pct);
    const peakLong = history.reduce((max, h) => (h.long_pct > max.long_pct ? h : max), history[0]);
    const peakShort = history.reduce((max, h) => (h.short_pct > max.long_pct ? h : max), history[0]);
    return { current, avg, trend, peakLong, peakShort };
  }, [history]);

  // Strongest conviction for heatmap tab
  const strongLong = useMemo(
    () => (sentiments ?? []).filter((s) => s.long_pct >= 50).sort((a, b) => b.long_pct - a.long_pct).slice(0, 5),
    [sentiments],
  );
  const strongShort = useMemo(
    () => (sentiments ?? []).filter((s) => s.short_pct > 50).sort((a, b) => b.short_pct - a.short_pct).slice(0, 5),
    [sentiments],
  );

  return (
    <div className="pt-container">
      <h1 className="pt-page-title">Market Sentiments</h1>

      {/* ─── Tab Switcher ─── */}
      <div className="pt-period-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`pt-period-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : !sentiments?.length ? (
        <EmptyState
          title="No sentiment data"
          description="Sentiment data will appear once traders start positioning."
        />
      ) : (
        <>
          {/* ═══ OVERVIEW TAB ═══ */}
          {tab === "overview" && (
            <>
              {/* Hero Stats */}
              {hero && (
                <div className="pt-sent-hero">
                  <div className="pt-sent-hero-card">
                    <div className="pt-sent-hero-val" style={{ color: "var(--lime-dim)" }}>
                      {hero.community_bullish_pct}%
                    </div>
                    <div className="pt-sent-hero-label">Community Bullish</div>
                    <div style={{ fontSize: 11, color: "var(--g400)", marginTop: 6 }}>
                      Based on {hero.total_traders.toLocaleString()} active positions
                    </div>
                  </div>
                  <div className="pt-sent-hero-card">
                    <div className="pt-sent-hero-val">
                      {hero.total_traders.toLocaleString()}
                    </div>
                    <div className="pt-sent-hero-label">Traders Positioned</div>
                    <div style={{ fontSize: 11, color: "var(--g400)", marginTop: 6 }}>
                      Across {sentiments.length} instruments
                    </div>
                  </div>
                  <div className="pt-sent-hero-card">
                    <div className="pt-sent-hero-val" style={{ color: "var(--lime-dim)" }}>
                      {hero.most_traded_symbol}
                    </div>
                    <div className="pt-sent-hero-label">Most Traded</div>
                    <div style={{ fontSize: 11, color: "var(--g400)", marginTop: 6 }}>
                      {hero.most_traded_positions} open positions right now
                    </div>
                  </div>
                </div>
              )}

              {/* Asset Class + Period Filters */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <div className="pt-period-tabs" style={{ marginBottom: 0 }}>
                  <button
                    className={`pt-period-tab ${!assetClass ? "active" : ""}`}
                    onClick={() => setAssetClass(undefined)}
                    style={{ fontSize: 12, padding: "6px 14px" }}
                  >
                    All
                  </button>
                  {ASSET_TABS.map((t) => (
                    <button
                      key={t.key}
                      className={`pt-period-tab ${assetClass === t.key ? "active" : ""}`}
                      onClick={() => setAssetClass(t.key)}
                      style={{ fontSize: 12, padding: "6px 14px" }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="pt-period-tabs" style={{ marginBottom: 0 }}>
                  {PERIOD_TABS.map((p) => (
                    <button
                      key={p}
                      className={`pt-period-tab ${period === p ? "active" : ""}`}
                      onClick={() => setPeriod(p)}
                      style={{ fontSize: 11, padding: "5px 12px" }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sentiment Cards Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: 14,
                  marginBottom: 24,
                }}
              >
                {sentiments.map((s) => (
                  <SentimentCard key={s.symbol} s={s} />
                ))}
              </div>

              {/* Biggest Movers */}
              <div className="pt-sent-movers">
                <div className="pt-sent-mover-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 18 }}>📈</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>Biggest Bull Shifts</div>
                      <div style={{ fontSize: 11, color: "var(--g400)" }}>
                        Largest long increase in 24h
                      </div>
                    </div>
                  </div>
                  {movers.bulls.length === 0 && (
                    <div style={{ fontSize: 12, color: "var(--g400)", padding: "8px 0" }}>
                      No significant bull shifts
                    </div>
                  )}
                  {movers.bulls.map((m) => {
                    const meta = INSTRUMENT_META[m.symbol as Instrument];
                    return (
                      <div className="pt-sent-mover-item" key={m.symbol}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: meta?.color ?? "#888",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 8,
                              fontWeight: 800,
                              color: "#fff",
                            }}
                          >
                            ●
                          </div>
                          <span style={{ fontWeight: 700, fontFamily: "var(--mono)", fontSize: 13 }}>
                            {m.symbol}
                          </span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontFamily: "var(--mono)",
                              color: "var(--lime-dim)",
                              fontSize: 14,
                            }}
                          >
                            +{Math.round(m.shift)}%
                          </div>
                          <div style={{ fontSize: 10, color: "var(--g400)" }}>
                            {m.from_pct}% → {m.to_pct}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-sent-mover-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 18 }}>📉</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>Biggest Bear Shifts</div>
                      <div style={{ fontSize: 11, color: "var(--g400)" }}>
                        Largest short increase in 24h
                      </div>
                    </div>
                  </div>
                  {movers.bears.length === 0 && (
                    <div style={{ fontSize: 12, color: "var(--g400)", padding: "8px 0" }}>
                      No significant bear shifts
                    </div>
                  )}
                  {movers.bears.map((m) => {
                    const meta = INSTRUMENT_META[m.symbol as Instrument];
                    return (
                      <div className="pt-sent-mover-item" key={m.symbol}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: meta?.color ?? "#888",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 8,
                              fontWeight: 800,
                              color: "#fff",
                            }}
                          >
                            ●
                          </div>
                          <span style={{ fontWeight: 700, fontFamily: "var(--mono)", fontSize: 13 }}>
                            {m.symbol}
                          </span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontFamily: "var(--mono)",
                              color: "var(--red)",
                              fontSize: 14,
                            }}
                          >
                            +{Math.round(m.shift)}%
                          </div>
                          <div style={{ fontSize: 10, color: "var(--g400)" }}>
                            {m.from_pct}% → {m.to_pct}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Extreme Readings */}
              {extremes.length > 0 && (
                <div
                  style={{
                    border: "var(--brd)",
                    borderRadius: "var(--r-lg)",
                    padding: 20,
                    marginBottom: 24,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>Extreme Readings</div>
                      <div style={{ fontSize: 11, color: "var(--g400)" }}>
                        Pairs where sentiment exceeds 70/30 split — potential reversal signals
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {extremes.map((e) => {
                      const isLong = e.side === "LONG";
                      const color = isLong ? "#65a30d" : "var(--red)";
                      return (
                        <div
                          className="pt-sent-extreme"
                          key={e.symbol}
                          style={{
                            background: `${color}12`,
                            color: isLong ? "var(--lime-dim)" : "var(--red)",
                            border: `1px solid ${color}30`,
                          }}
                        >
                          <span style={{ fontWeight: 800 }}>{e.symbol}</span>
                          <span>
                            {e.pct}% {e.side}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sentiment vs Price Divergence */}
              {divergences.length > 0 && (
                <div
                  style={{
                    border: "var(--brd)",
                    borderRadius: "var(--r-lg)",
                    padding: 20,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 18 }}>🔀</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>
                        Sentiment vs Price Divergence
                      </div>
                      <div style={{ fontSize: 11, color: "var(--g400)" }}>
                        When community sentiment contradicts price action — often a leading indicator
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${Math.min(divergences.length, 3)},1fr)`,
                      gap: 12,
                    }}
                  >
                    {divergences.map((d) => {
                      const signalColor = d.bullish ? "#65a30d" : "var(--red)";
                      return (
                        <div
                          key={d.symbol}
                          style={{
                            border: "var(--brd)",
                            borderRadius: "var(--r-md)",
                            padding: 14,
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 800,
                              fontFamily: "var(--mono)",
                              fontSize: 14,
                              marginBottom: 8,
                            }}
                          >
                            {d.symbol}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 4,
                            }}
                          >
                            <span style={{ fontSize: 11, color: "var(--g400)" }}>Price</span>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                fontFamily: "var(--mono)",
                                color: d.price_change.startsWith("+")
                                  ? "var(--lime-dim)"
                                  : "var(--red)",
                              }}
                            >
                              {d.price_change}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 8,
                            }}
                          >
                            <span style={{ fontSize: 11, color: "var(--g400)" }}>Sentiment</span>
                            <span
                              style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--mono)" }}
                            >
                              {d.sentiment_pct}
                            </span>
                          </div>
                          <div
                            style={{
                              padding: "4px 10px",
                              borderRadius: "var(--r-full)",
                              fontSize: 10,
                              fontWeight: 700,
                              textAlign: "center",
                              background: `${signalColor}12`,
                              color: d.bullish ? "var(--lime-dim)" : "var(--red)",
                              border: `1px solid ${signalColor}25`,
                            }}
                          >
                            {d.signal}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ═══ HEATMAP TAB ═══ */}
          {tab === "heatmap" && (
            <>
              {/* Filter + Legend */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <div className="pt-period-tabs" style={{ marginBottom: 0 }}>
                  <button
                    className={`pt-period-tab ${!assetClass ? "active" : ""}`}
                    onClick={() => setAssetClass(undefined)}
                    style={{ fontSize: 12, padding: "6px 14px" }}
                  >
                    All
                  </button>
                  {ASSET_TABS.map((t) => (
                    <button
                      key={t.key}
                      className={`pt-period-tab ${assetClass === t.key ? "active" : ""}`}
                      onClick={() => setAssetClass(t.key)}
                      style={{ fontSize: 12, padding: "6px 14px" }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11 }}>
                  {[
                    { label: "Strong Long", bg: "#65a30d" },
                    { label: "Mild Long", bg: "rgba(101,163,13,.3)" },
                    { label: "Neutral", bg: "var(--g200)" },
                    { label: "Mild Short", bg: "rgba(255,68,68,.3)" },
                    { label: "Strong Short", bg: "var(--red)" },
                  ].map((l) => (
                    <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span
                        style={{ width: 12, height: 12, borderRadius: 3, background: l.bg }}
                      />
                      {l.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Heatmap Grid */}
              <div className="pt-sent-heatmap" style={{ marginBottom: 24 }}>
                {sentiments.map((s) => (
                  <HeatCell key={s.symbol} s={s} />
                ))}
              </div>

              {/* Strongest Conviction */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ border: "var(--brd)", borderRadius: "var(--r-lg)", padding: 16 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 13,
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ color: "#65a30d" }}>●</span> Strongest Long Conviction
                  </div>
                  {strongLong.map((s, i) => (
                    <div
                      key={s.symbol}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "6px 0",
                        borderBottom: i < strongLong.length - 1 ? "1px solid var(--g100)" : "none",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          fontFamily: "var(--mono)",
                          color: "var(--g300)",
                          width: 20,
                        }}
                      >
                        #{i + 1}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontFamily: "var(--mono)",
                          fontSize: 13,
                          flex: 1,
                        }}
                      >
                        {s.symbol}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--g400)" }}>
                        {s.positions} traders
                      </span>
                      <span
                        style={{
                          fontWeight: 800,
                          fontFamily: "var(--mono)",
                          fontSize: 14,
                          color: "var(--lime-dim)",
                        }}
                      >
                        {Math.round(s.long_pct)}%
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ border: "var(--brd)", borderRadius: "var(--r-lg)", padding: 16 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 13,
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ color: "var(--red)" }}>●</span> Strongest Short Conviction
                  </div>
                  {strongShort.map((s, i) => (
                    <div
                      key={s.symbol}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "6px 0",
                        borderBottom: i < strongShort.length - 1 ? "1px solid var(--g100)" : "none",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          fontFamily: "var(--mono)",
                          color: "var(--g300)",
                          width: 20,
                        }}
                      >
                        #{i + 1}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontFamily: "var(--mono)",
                          fontSize: 13,
                          flex: 1,
                        }}
                      >
                        {s.symbol}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--g400)" }}>
                        {s.positions} traders
                      </span>
                      <span
                        style={{
                          fontWeight: 800,
                          fontFamily: "var(--mono)",
                          fontSize: 14,
                          color: "var(--red)",
                        }}
                      >
                        {Math.round(s.short_pct)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ═══ HISTORY TAB ═══ */}
          {tab === "history" && (
            <>
              {/* Instrument Selector + Period */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>Sentiment History —</div>
                  <select
                    value={historySymbol}
                    onChange={(e) => setHistorySymbol(e.target.value)}
                    style={{
                      fontWeight: 800,
                      fontFamily: "var(--mono)",
                      fontSize: 14,
                      padding: "6px 12px",
                      border: "var(--brd)",
                      borderRadius: "var(--r-md)",
                      background: "var(--white)",
                      cursor: "pointer",
                    }}
                  >
                    {allInstruments.map((sym) => (
                      <option key={sym} value={sym}>
                        {sym}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pt-period-tabs" style={{ marginBottom: 0 }}>
                  {HISTORY_PERIODS.map((p) => (
                    <button
                      key={p}
                      className={`pt-period-tab ${historyPeriod === p ? "active" : ""}`}
                      onClick={() => setHistoryPeriod(p)}
                      style={{ fontSize: 11, padding: "5px 12px" }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats Row */}
              {historyStats && (
                <div
                  style={{
                    border: "var(--brd)",
                    borderRadius: "var(--r-xl)",
                    padding: 24,
                    marginBottom: 24,
                  }}
                >
                  <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--g400)" }}>Current</span>
                      <div
                        style={{
                          fontWeight: 800,
                          fontFamily: "var(--mono)",
                          fontSize: 20,
                          color: "var(--lime-dim)",
                        }}
                      >
                        {Math.round(historyStats.current.long_pct)}% Long
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--g400)" }}>Avg</span>
                      <div
                        style={{ fontWeight: 800, fontFamily: "var(--mono)", fontSize: 20 }}
                      >
                        {historyStats.avg}% Long
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--g400)" }}>Trend</span>
                      <div
                        style={{
                          fontWeight: 800,
                          fontFamily: "var(--mono)",
                          fontSize: 20,
                          color: historyStats.trend >= 0 ? "var(--lime-dim)" : "var(--red)",
                        }}
                      >
                        {historyStats.trend >= 0 ? "↑" : "↓"} {historyStats.trend >= 0 ? "+" : ""}
                        {historyStats.trend}%
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--g400)" }}>Peak Long</span>
                      <div
                        style={{ fontWeight: 800, fontFamily: "var(--mono)", fontSize: 20 }}
                      >
                        {Math.round(historyStats.peakLong.long_pct)}%
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--g400)" }}>Peak Short</span>
                      <div
                        style={{ fontWeight: 800, fontFamily: "var(--mono)", fontSize: 20 }}
                      >
                        {Math.round(historyStats.peakShort.short_pct)}%
                      </div>
                    </div>
                  </div>

                  {/* Chart */}
                  <HistoryChart data={history ?? []} />
                </div>
              )}

              {/* Hourly Snapshots Table */}
              {history && history.length > 0 && (
                <div className="pt-sent-hist">
                  <div className="pt-sent-hist-header">
                    <div style={{ fontWeight: 800, fontSize: 14 }}>Hourly Snapshots</div>
                    <div style={{ fontSize: 11, color: "var(--g400)" }}>
                      Last {history.length} hours · {historySymbol}
                    </div>
                  </div>
                  {/* Table header */}
                  <div
                    className="pt-sent-hist-row"
                    style={{
                      fontWeight: 700,
                      fontSize: 11,
                      color: "var(--g400)",
                      borderBottom: "var(--brd)",
                    }}
                  >
                    <span>Time</span>
                    <span>Sentiment Bar</span>
                    <span style={{ textAlign: "center" }}>Long %</span>
                    <span style={{ textAlign: "center" }}>Short %</span>
                    <span style={{ textAlign: "center" }}>Change</span>
                  </div>
                  {/* Reverse to show newest first */}
                  {[...history].reverse().map((h, i, arr) => {
                    const prev = arr[i + 1];
                    const change = prev ? Math.round(h.long_pct - prev.long_pct) : 0;
                    const changeStr =
                      change > 0
                        ? `+${change}%`
                        : change < 0
                          ? `${change}%`
                          : "0%";

                    // Time label
                    const hoursAgo = i;
                    const timeLabel = hoursAgo === 0 ? "Now" : `${hoursAgo}h ago`;

                    return (
                      <div className="pt-sent-hist-row" key={h.id}>
                        <span
                          style={{
                            fontWeight: 600,
                            fontFamily: "var(--mono)",
                            fontSize: 12,
                          }}
                        >
                          {timeLabel}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            style={{
                              flex: 1,
                              height: 6,
                              borderRadius: 3,
                              background: "var(--g100)",
                              overflow: "hidden",
                              display: "flex",
                            }}
                          >
                            <div
                              style={{
                                width: `${h.long_pct}%`,
                                height: "100%",
                                background: "#65a30d",
                                borderRadius: "3px 0 0 3px",
                              }}
                            />
                            <div
                              style={{
                                width: `${h.short_pct}%`,
                                height: "100%",
                                background: "var(--red)",
                                borderRadius: "0 3px 3px 0",
                              }}
                            />
                          </div>
                        </div>
                        <span
                          style={{
                            textAlign: "center",
                            fontWeight: 700,
                            fontFamily: "var(--mono)",
                            fontSize: 13,
                            color: "var(--lime-dim)",
                          }}
                        >
                          {Math.round(h.long_pct)}%
                        </span>
                        <span
                          style={{
                            textAlign: "center",
                            fontWeight: 700,
                            fontFamily: "var(--mono)",
                            fontSize: 13,
                            color: "var(--red)",
                          }}
                        >
                          {Math.round(h.short_pct)}%
                        </span>
                        <span
                          style={{
                            textAlign: "center",
                            fontWeight: 700,
                            fontFamily: "var(--mono)",
                            fontSize: 12,
                            color: changeStr.startsWith("+")
                              ? "var(--lime-dim)"
                              : changeStr.startsWith("-")
                                ? "var(--red)"
                                : "var(--g400)",
                          }}
                        >
                          {changeStr}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
