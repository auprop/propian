"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  useSession,
  useTradeStats,
  useEquityCurve,
  usePairBreakdown,
  usePortfolioSummary,
  useDayOfWeekStats,
  useHourOfDayStats,
  useDirectionStats,
  useEmotionStats,
  useSetupStats,
  useMistakeStats,
  useDrawdownCurve,
  useWeeklyPnl,
  useRiskRewardDistribution,
} from "@propian/shared/hooks";
import type {
  DayOfWeekStats,
  HourOfDayStats,
  DirectionStats,
  EmotionStats,
  SetupStats,
  MistakeStats,
  DrawdownPoint,
  WeeklyPnl,
  RiskRewardBucket,
  EquityCurvePoint,
  PairBreakdown,
} from "@propian/shared/types";
import { formatCurrency, formatPercent } from "@propian/shared/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconBarChart } from "@propian/shared/icons";

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */

function pnlColor(val: number) {
  return val > 0 ? "var(--green)" : val < 0 ? "var(--red)" : "var(--g400)";
}

function pnlSign(val: number) {
  return val > 0 ? "+" : "";
}

const EMOTION_EMOJI: Record<string, string> = {
  confident: "😎",
  neutral: "😐",
  fearful: "😰",
  greedy: "🤑",
  revenge: "😡",
};

/* ================================================================== */
/*  Overview Stats Row                                                  */
/* ================================================================== */

function OverviewStats({
  stats,
  summary,
  isLoading,
}: {
  stats?: { total_trades: number; win_rate: number; total_pnl: number; profit_factor: number; avg_rr: number; avg_pnl: number };
  summary?: { max_drawdown: number; longest_win_streak: number; active_days: number };
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="pt-stat-card">
            <Skeleton width={50} height={12} borderRadius={4} />
            <div style={{ marginTop: 8 }}>
              <Skeleton width={80} height={32} borderRadius={4} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: "Total Trades",
      value: String(stats?.total_trades ?? 0),
      color: undefined,
    },
    {
      label: "Net P&L",
      value: `${pnlSign(stats?.total_pnl ?? 0)}${formatCurrency(stats?.total_pnl ?? 0)}`,
      color: pnlColor(stats?.total_pnl ?? 0),
    },
    {
      label: "Win Rate",
      value: `${(stats?.win_rate ?? 0).toFixed(1)}%`,
      color: (stats?.win_rate ?? 0) >= 50 ? "var(--green)" : "var(--red)",
    },
    {
      label: "Profit Factor",
      value: (stats?.profit_factor ?? 0) === Infinity ? "\u221E" : (stats?.profit_factor ?? 0).toFixed(2),
      color: undefined,
    },
    {
      label: "Avg R:R",
      value: (stats?.avg_rr ?? 0).toFixed(2),
      color: undefined,
    },
    {
      label: "Max Drawdown",
      value: formatCurrency(summary?.max_drawdown ?? 0),
      color: "var(--red)",
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
      {items.map((item) => (
        <div key={item.label} className="pt-stat-card">
          <div className="pt-stat-label">{item.label}</div>
          <div className="pt-stat-value" style={item.color ? { color: item.color, fontSize: 28, letterSpacing: "-1.5px" } : { fontSize: 28, letterSpacing: "-1.5px" }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Equity Curve + Drawdown (stacked)                                   */
/* ================================================================== */

function EquityDrawdownChart({
  equityCurve,
  drawdownCurve,
}: {
  equityCurve: EquityCurvePoint[];
  drawdownCurve: DrawdownPoint[];
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const W = 700;
  const H_EQ = 180;
  const H_DD = 80;
  const PAD = { top: 12, right: 16, bottom: 4, left: 16 };

  const eqData = useMemo(() => {
    if (equityCurve.length < 2) return null;
    const values = equityCurve.map((d) => d.cumulative_pnl);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const range = max - min || 1;

    const pts = equityCurve
      .map((d, i) => {
        const x = PAD.left + (i / (equityCurve.length - 1)) * (W - PAD.left - PAD.right);
        const y = PAD.top + (1 - (d.cumulative_pnl - min) / range) * (H_EQ - PAD.top - PAD.bottom);
        return `${x},${y}`;
      })
      .join(" ");

    const zeroY = PAD.top + (1 - (0 - min) / range) * (H_EQ - PAD.top - PAD.bottom);
    return { points: pts, zeroY };
  }, [equityCurve]);

  const ddData = useMemo(() => {
    if (drawdownCurve.length < 2) return null;
    const maxDD = Math.max(...drawdownCurve.map((d) => d.drawdown), 1);

    const pts = drawdownCurve
      .map((d, i) => {
        const x = PAD.left + (i / (drawdownCurve.length - 1)) * (W - PAD.left - PAD.right);
        const y = 4 + (d.drawdown / maxDD) * (H_DD - 8);
        return `${x},${y}`;
      })
      .join(" ");

    return { points: pts };
  }, [drawdownCurve]);

  if (!eqData) {
    return (
      <div className="pt-card" style={{ padding: 32, textAlign: "center", color: "var(--g400)", fontSize: 14 }}>
        Need at least 2 closed trading days to show charts.
      </div>
    );
  }

  const lastPnl = equityCurve[equityCurve.length - 1]?.cumulative_pnl ?? 0;
  const curveColor = lastPnl >= 0 ? "var(--green)" : "var(--red)";
  const colW = (W - 32) / equityCurve.length;
  const hovered = hoveredIdx != null ? equityCurve[hoveredIdx] : null;

  return (
    <div className="pt-card" style={{ padding: "16px 0 0 0" }}>
      {/* Equity curve */}
      <div style={{ padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.2px" }}>EQUITY CURVE</div>
        {hovered && (
          <div style={{ fontSize: 12, color: "var(--g500)", fontFamily: "var(--font-mono)" }}>
            {hovered.date} &middot;{" "}
            <span style={{ color: pnlColor(hovered.cumulative_pnl), fontWeight: 700 }}>
              {pnlSign(hovered.cumulative_pnl)}
              {formatCurrency(hovered.cumulative_pnl)}
            </span>
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H_EQ}`} style={{ width: "100%", height: "auto", display: "block" }} onMouseLeave={() => setHoveredIdx(null)}>
        <defs>
          <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={curveColor} stopOpacity={0.2} />
            <stop offset="100%" stopColor={curveColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <line x1={PAD.left} y1={eqData.zeroY} x2={W - PAD.right} y2={eqData.zeroY} stroke="var(--g200)" strokeWidth={1} strokeDasharray="4 4" />
        <polygon points={`${PAD.left},${eqData.zeroY} ${eqData.points} ${W - PAD.right},${eqData.zeroY}`} fill="url(#eqFill)" />
        <polyline points={eqData.points} fill="none" stroke={curveColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {equityCurve.map((_, i) => {
          const x = PAD.left + (i / (equityCurve.length - 1)) * (W - PAD.left - PAD.right);
          return <rect key={i} x={x - colW / 2} y={0} width={colW} height={H_EQ} fill="transparent" onMouseEnter={() => setHoveredIdx(i)} />;
        })}
        {hoveredIdx != null && (() => {
          const vals = equityCurve.map((d) => d.cumulative_pnl);
          const min = Math.min(0, ...vals);
          const max = Math.max(0, ...vals);
          const range = max - min || 1;
          const cx = PAD.left + (hoveredIdx / (equityCurve.length - 1)) * (W - PAD.left - PAD.right);
          const cy = PAD.top + (1 - (equityCurve[hoveredIdx].cumulative_pnl - min) / range) * (H_EQ - PAD.top - PAD.bottom);
          return <circle cx={cx} cy={cy} r={5} fill={curveColor} stroke="var(--white)" strokeWidth={2} />;
        })()}
      </svg>

      {/* Drawdown curve */}
      {ddData && (
        <>
          <div style={{ padding: "8px 20px 4px", fontSize: 11, fontWeight: 700, color: "var(--g400)", letterSpacing: "0.5px" }}>
            DRAWDOWN
          </div>
          <svg viewBox={`0 0 ${W} ${H_DD}`} style={{ width: "100%", height: "auto", display: "block" }}>
            <defs>
              <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--red)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--red)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <polygon points={`${PAD.left},0 ${ddData.points} ${W - PAD.right},0`} fill="url(#ddFill)" />
            <polyline points={ddData.points} fill="none" stroke="var(--red)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Day of Week Bar Chart                                               */
/* ================================================================== */

function DayOfWeekChart({ data, isLoading }: { data: DayOfWeekStats[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="pt-card" style={{ padding: 16 }}>
        <Skeleton width="100%" height={160} borderRadius={8} />
      </div>
    );
  }

  // Show Mon-Fri only (day 1-5), trading week
  const weekdays = [1, 2, 3, 4, 5].map((d) => data.find((x) => x.day === d) ?? { day: d, day_name: ["", "Mon", "Tue", "Wed", "Thu", "Fri"][d], trade_count: 0, win_count: 0, win_rate: 0, total_pnl: 0, avg_pnl: 0 });
  const maxPnl = Math.max(...weekdays.map((d) => Math.abs(d.total_pnl)), 1);

  return (
    <div className="pt-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--g100)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.2px" }}>
        P&L BY DAY OF WEEK
      </div>
      <div style={{ padding: "16px 20px", display: "flex", gap: 8, alignItems: "flex-end", height: 180 }}>
        {weekdays.map((d) => {
          const barH = maxPnl > 0 ? (Math.abs(d.total_pnl) / maxPnl) * 120 : 0;
          const isPositive = d.total_pnl >= 0;
          return (
            <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: pnlColor(d.total_pnl) }}>
                {d.trade_count > 0 ? `${pnlSign(d.total_pnl)}${formatCurrency(d.total_pnl)}` : ""}
              </div>
              <div
                style={{
                  width: "100%",
                  maxWidth: 48,
                  height: Math.max(barH, 4),
                  borderRadius: "6px 6px 0 0",
                  backgroundColor: isPositive ? "var(--lime)" : "var(--red)",
                  opacity: d.trade_count === 0 ? 0.15 : 1,
                  transition: "height 0.6s cubic-bezier(.34, 1.56, .64, 1)",
                }}
              />
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--g500)" }}>{d.day_name.slice(0, 3)}</div>
              <div style={{ fontSize: 10, color: "var(--g400)" }}>
                {d.trade_count > 0 ? `${d.win_rate.toFixed(0)}% WR` : "\u2014"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Hour of Day Heatmap Bar                                             */
/* ================================================================== */

function HourOfDayChart({ data, isLoading }: { data: HourOfDayStats[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="pt-card" style={{ padding: 16 }}>
        <Skeleton width="100%" height={80} borderRadius={8} />
      </div>
    );
  }

  // Only show hours that have trades, grouped into trading sessions
  const activeHours = data.filter((h) => h.trade_count > 0);
  if (activeHours.length === 0) {
    return (
      <div className="pt-card" style={{ padding: 24, textAlign: "center", color: "var(--g400)", fontSize: 14 }}>
        No time-of-day data available
      </div>
    );
  }

  const maxCount = Math.max(...data.map((h) => h.trade_count), 1);

  return (
    <div className="pt-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--g100)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.2px" }}>
        TRADES BY HOUR
      </div>
      <div style={{ padding: "12px 20px", display: "flex", gap: 2, alignItems: "flex-end", height: 100 }}>
        {data.map((h) => {
          const barH = maxCount > 0 ? (h.trade_count / maxCount) * 60 : 0;
          const isProfit = h.total_pnl >= 0;
          return (
            <div
              key={h.hour}
              title={`${h.hour}:00 – ${h.trade_count} trades, ${h.win_rate.toFixed(0)}% WR, ${pnlSign(h.total_pnl)}${formatCurrency(h.total_pnl)}`}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
            >
              <div
                style={{
                  width: "100%",
                  height: Math.max(barH, 2),
                  borderRadius: "3px 3px 0 0",
                  backgroundColor: h.trade_count === 0 ? "var(--g100)" : isProfit ? "var(--lime)" : "var(--red)",
                  opacity: h.trade_count === 0 ? 0.4 : 1,
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 20px 12px", fontSize: 10, color: "var(--g400)" }}>
        <span>0:00</span>
        <span>6:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Direction Breakdown                                                 */
/* ================================================================== */

function DirectionBreakdown({ data, isLoading }: { data: DirectionStats[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="pt-card" style={{ padding: 16 }}>
        <Skeleton width="100%" height={80} borderRadius={8} />
      </div>
    );
  }

  const longData = data.find((d) => d.direction === "long");
  const shortData = data.find((d) => d.direction === "short");
  const total = (longData?.trade_count ?? 0) + (shortData?.trade_count ?? 0);

  if (total === 0) {
    return (
      <div className="pt-card" style={{ padding: 24, textAlign: "center", color: "var(--g400)", fontSize: 14 }}>
        No direction data available
      </div>
    );
  }

  const longPct = total > 0 ? ((longData?.trade_count ?? 0) / total) * 100 : 50;

  return (
    <div className="pt-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--g100)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.2px" }}>
        LONG VS SHORT
      </div>
      <div style={{ padding: "16px 20px" }}>
        {/* Sentiment-style bar */}
        <div className="pt-sentiment" style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green)", minWidth: 40 }}>
            {longPct.toFixed(0)}%
          </span>
          <div className="pt-sentiment-bar">
            <div style={{ width: `${longPct}%`, backgroundColor: "var(--green)", height: "100%" }} />
            <div style={{ width: `${100 - longPct}%`, backgroundColor: "var(--red)", height: "100%" }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--red)", minWidth: 40, textAlign: "right" }}>
            {(100 - longPct).toFixed(0)}%
          </span>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "LONG", d: longData, color: "var(--green)" },
            { label: "SHORT", d: shortData, color: "var(--red)" },
          ].map(({ label, d, color }) => (
            <div key={label} style={{ borderLeft: `3px solid ${color}`, paddingLeft: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                {label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12, color: "var(--g600)" }}>
                <span>{d?.trade_count ?? 0} trades &middot; {(d?.win_rate ?? 0).toFixed(1)}% WR</span>
                <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: pnlColor(d?.total_pnl ?? 0) }}>
                  {pnlSign(d?.total_pnl ?? 0)}{formatCurrency(d?.total_pnl ?? 0)}
                </span>
                <span>Avg R:R {(d?.avg_rr ?? 0).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Emotion Performance                                                 */
/* ================================================================== */

function EmotionPerformance({ data, isLoading }: { data: EmotionStats[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="pt-card" style={{ padding: 16 }}>
        <Skeleton width="100%" height={120} borderRadius={8} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="pt-card" style={{ padding: 24, textAlign: "center", color: "var(--g400)", fontSize: 14 }}>
        Log emotions on trades to see performance breakdown
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.trade_count), 1);

  return (
    <div className="pt-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--g100)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.2px" }}>
        EMOTION ANALYSIS
      </div>
      <div style={{ padding: "8px 0" }}>
        {data.map((e) => (
          <div key={e.emotion} style={{ display: "flex", alignItems: "center", padding: "8px 20px", gap: 12 }}>
            <div style={{ fontSize: 20, width: 28, textAlign: "center" }}>{EMOTION_EMOJI[e.emotion] ?? "❓"}</div>
            <div style={{ minWidth: 72, fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{e.emotion}</div>
            <div style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: "var(--g100)", overflow: "hidden" }}>
              <div style={{ width: `${(e.trade_count / maxCount) * 100}%`, height: "100%", borderRadius: 4, backgroundColor: pnlColor(e.total_pnl) === "var(--green)" ? "var(--lime)" : pnlColor(e.total_pnl) }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--g500)", minWidth: 30, textAlign: "right" }}>
              {e.win_rate.toFixed(0)}%
            </div>
            <div style={{ fontSize: 11, color: "var(--g400)", minWidth: 20, textAlign: "right" }}>{e.trade_count}</div>
            <div style={{ fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 13, minWidth: 70, textAlign: "right", color: pnlColor(e.total_pnl) }}>
              {pnlSign(e.total_pnl)}{formatCurrency(e.total_pnl)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Pair Performance Table                                              */
/* ================================================================== */

function PairPerformanceTable({ data, isLoading }: { data: PairBreakdown[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="pt-price-table">
        <Skeleton width="100%" height={200} borderRadius={0} />
      </div>
    );
  }

  if (data.length === 0) return null;

  const best = data.reduce((a, b) => (a.total_pnl > b.total_pnl ? a : b), data[0]);

  return (
    <div className="pt-price-table">
      <table>
        <thead>
          <tr>
            <th>Pair</th>
            <th>Trades</th>
            <th>Win Rate</th>
            <th>Avg P&L</th>
            <th style={{ textAlign: "right" }}>Total P&L</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 12).map((p) => (
            <tr key={p.pair}>
              <td style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                {p.pair}
                {p.pair === best.pair && data.length > 1 && (
                  <span className="pt-price-best" style={{ marginLeft: 8 }}>BEST</span>
                )}
              </td>
              <td>{p.trade_count}</td>
              <td>
                <span style={{ color: p.win_rate >= 50 ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                  {p.win_rate.toFixed(1)}%
                </span>
              </td>
              <td style={{ fontFamily: "var(--font-mono)", color: pnlColor(p.avg_pnl) }}>
                {pnlSign(p.avg_pnl)}{formatCurrency(p.avg_pnl)}
              </td>
              <td style={{ textAlign: "right", fontWeight: 700, fontFamily: "var(--font-mono)", color: pnlColor(p.total_pnl) }}>
                {pnlSign(p.total_pnl)}{formatCurrency(p.total_pnl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================== */
/*  Weekly P&L Bar Chart                                                */
/* ================================================================== */

function WeeklyPnlChart({ data, isLoading }: { data: WeeklyPnl[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="pt-card" style={{ padding: 16 }}>
        <Skeleton width="100%" height={160} borderRadius={8} />
      </div>
    );
  }

  const recent = data.slice(-12); // last 12 weeks
  if (recent.length === 0) {
    return (
      <div className="pt-card" style={{ padding: 24, textAlign: "center", color: "var(--g400)", fontSize: 14 }}>
        No weekly data yet
      </div>
    );
  }

  const maxPnl = Math.max(...recent.map((w) => Math.abs(w.pnl)), 1);

  return (
    <div className="pt-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--g100)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.2px" }}>
        WEEKLY P&L (LAST 12 WEEKS)
      </div>
      <div style={{ padding: "16px 20px 12px", display: "flex", gap: 6, alignItems: "flex-end", height: 160 }}>
        {recent.map((w) => {
          const barH = maxPnl > 0 ? (Math.abs(w.pnl) / maxPnl) * 100 : 0;
          return (
            <div key={w.week_start} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, color: pnlColor(w.pnl) }}>
                {pnlSign(w.pnl)}{formatCurrency(w.pnl)}
              </div>
              <div
                style={{
                  width: "100%",
                  maxWidth: 36,
                  height: Math.max(barH, 4),
                  borderRadius: "5px 5px 0 0",
                  backgroundColor: w.pnl >= 0 ? "var(--lime)" : "var(--red)",
                }}
              />
              <div style={{ fontSize: 9, color: "var(--g400)", whiteSpace: "nowrap" }}>
                {w.week_start.slice(5)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  R:R Distribution                                                    */
/* ================================================================== */

function RRDistribution({ data, isLoading }: { data: RiskRewardBucket[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="pt-card" style={{ padding: 16 }}>
        <Skeleton width="100%" height={100} borderRadius={8} />
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div className="pt-card" style={{ padding: 24, textAlign: "center", color: "var(--g400)", fontSize: 14 }}>
        Log R:R on trades to see distribution
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="pt-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--g100)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.2px" }}>
        RISK:REWARD DISTRIBUTION
      </div>
      <div style={{ padding: "12px 20px" }}>
        {data.map((b) => (
          <div key={b.bucket} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
            <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", minWidth: 75, color: "var(--g600)" }}>
              {b.bucket}
            </div>
            <div style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: "var(--g100)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${(b.count / maxCount) * 100}%`,
                  height: "100%",
                  borderRadius: 5,
                  backgroundColor: b.win_rate >= 50 ? "var(--lime)" : "var(--red)",
                  opacity: b.count === 0 ? 0.2 : 1,
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: "var(--g500)", minWidth: 20, textAlign: "right" }}>{b.count}</div>
            <div style={{ fontSize: 11, color: "var(--g400)", minWidth: 35, textAlign: "right" }}>
              {b.count > 0 ? `${b.win_rate.toFixed(0)}%` : "\u2014"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Setup & Mistakes cards                                              */
/* ================================================================== */

function SetupPerformance({ data, isLoading }: { data: SetupStats[]; isLoading: boolean }) {
  if (isLoading) return <div className="pt-card" style={{ padding: 16 }}><Skeleton width="100%" height={100} borderRadius={8} /></div>;
  if (data.length === 0) return <div className="pt-card" style={{ padding: 24, textAlign: "center", color: "var(--g400)", fontSize: 14 }}>Log setups on trades to see performance</div>;

  return (
    <div className="pt-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--g100)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.2px" }}>
        SETUP PERFORMANCE
      </div>
      <div style={{ padding: "8px 0" }}>
        {data.slice(0, 8).map((s) => (
          <div key={s.setup} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{s.setup}</span>
              <span style={{ fontSize: 11, color: "var(--g400)" }}>{s.trade_count} trades</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: s.win_rate >= 50 ? "var(--green)" : "var(--red)" }}>
                {s.win_rate.toFixed(0)}% WR
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: pnlColor(s.total_pnl) }}>
                {pnlSign(s.total_pnl)}{formatCurrency(s.total_pnl)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommonMistakes({ data, isLoading }: { data: MistakeStats[]; isLoading: boolean }) {
  if (isLoading) return <div className="pt-card" style={{ padding: 16 }}><Skeleton width="100%" height={100} borderRadius={8} /></div>;
  if (data.length === 0) return <div className="pt-card" style={{ padding: 24, textAlign: "center", color: "var(--g400)", fontSize: 14 }}>Log mistakes on trades to see patterns</div>;

  return (
    <div className="pt-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--g100)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.2px" }}>
        COMMON MISTAKES
      </div>
      <div style={{ padding: "8px 0" }}>
        {data.slice(0, 8).map((m) => (
          <div key={m.mistake} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{m.mistake}</span>
              <span style={{ fontSize: 11, color: "var(--g400)" }}>&times;{m.count}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: pnlColor(m.total_pnl) }}>
              {pnlSign(m.total_pnl)}{formatCurrency(m.total_pnl)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Main Page                                                           */
/* ================================================================== */

export default function AnalyticsPage() {
  const supabase = createBrowserClient();
  const { data: session } = useSession(supabase);

  const { data: stats, isLoading: statsLoading } = useTradeStats(supabase);
  const { data: summary, isLoading: summaryLoading } = usePortfolioSummary(supabase);
  const { data: equityCurve, isLoading: eqLoading } = useEquityCurve(supabase);
  const { data: pairBreakdown, isLoading: pairLoading } = usePairBreakdown(supabase);
  const { data: dayOfWeek, isLoading: dowLoading } = useDayOfWeekStats(supabase);
  const { data: hourOfDay, isLoading: hodLoading } = useHourOfDayStats(supabase);
  const { data: direction, isLoading: dirLoading } = useDirectionStats(supabase);
  const { data: emotion, isLoading: emoLoading } = useEmotionStats(supabase);
  const { data: setups, isLoading: setupLoading } = useSetupStats(supabase);
  const { data: mistakes, isLoading: mistakeLoading } = useMistakeStats(supabase);
  const { data: drawdown, isLoading: ddLoading } = useDrawdownCurve(supabase);
  const { data: weeklyPnl, isLoading: wpLoading } = useWeeklyPnl(supabase);
  const { data: rrDist, isLoading: rrLoading } = useRiskRewardDistribution(supabase);

  const isEmpty = !statsLoading && (stats?.total_trades ?? 0) === 0;

  return (
    <div className="pt-container">
      <div className="pt-page-header">
        <h1 className="pt-page-title">Analytics</h1>
        {stats && !isEmpty && (
          <span style={{ fontSize: 12, color: "var(--g400)" }}>
            Based on {stats.total_trades} closed trades
          </span>
        )}
      </div>

      {isEmpty ? (
        <EmptyState
          icon={<IconBarChart size={40} />}
          title="No analytics yet"
          description="Close your first trade in the Journal to start seeing performance analytics."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Overview stat cards */}
          <OverviewStats stats={stats} summary={summary} isLoading={statsLoading || summaryLoading} />

          {/* Equity curve + drawdown */}
          <EquityDrawdownChart equityCurve={equityCurve ?? []} drawdownCurve={drawdown ?? []} />

          {/* Two-column layout */}
          <div className="pt-feed-layout">
            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <WeeklyPnlChart data={weeklyPnl ?? []} isLoading={wpLoading} />
              <DayOfWeekChart data={dayOfWeek ?? []} isLoading={dowLoading} />
              <HourOfDayChart data={hourOfDay ?? []} isLoading={hodLoading} />
              <PairPerformanceTable data={pairBreakdown ?? []} isLoading={pairLoading} />
            </div>

            {/* Right column */}
            <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <DirectionBreakdown data={direction ?? []} isLoading={dirLoading} />
              <EmotionPerformance data={emotion ?? []} isLoading={emoLoading} />
              <RRDistribution data={rrDist ?? []} isLoading={rrLoading} />
              <SetupPerformance data={setups ?? []} isLoading={setupLoading} />
              <CommonMistakes data={mistakes ?? []} isLoading={mistakeLoading} />
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
