"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  useSession,
  usePortfolioSummary,
  useEquityCurve,
  useOpenPositions,
  usePairBreakdown,
  useMonthlyReturns,
  useTradeStats,
} from "@propian/shared/hooks";
import type {
  Trade,
  EquityCurvePoint,
  PairBreakdown,
  MonthlyReturn,
  PortfolioSummary,
} from "@propian/shared/types";
import { formatCurrency } from "@propian/shared/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { IconChart } from "@propian/shared/icons";

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */

function pnlColor(val: number) {
  return val > 0 ? "var(--green)" : val < 0 ? "var(--red)" : "var(--g400)";
}

function pnlSign(val: number) {
  return val > 0 ? "+" : "";
}

/* ================================================================== */
/*  Summary Cards                                                       */
/* ================================================================== */

function SummaryCards({
  summary,
  stats,
  isLoading,
}: {
  summary?: PortfolioSummary;
  stats?: { win_rate: number; avg_rr: number; profit_factor: number; total_trades: number };
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="pt-journal-stats">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="pt-journal-stat">
            <Skeleton width={70} height={26} borderRadius={4} />
            <div style={{ marginTop: 6 }}>
              <Skeleton width={80} height={12} borderRadius={4} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: "Total P&L",
      value: formatCurrency(summary?.total_pnl ?? 0),
      color: pnlColor(summary?.total_pnl ?? 0),
    },
    {
      label: "Open P&L",
      value: formatCurrency(summary?.open_pnl ?? 0),
      sub: `${summary?.open_positions ?? 0} positions`,
      color: pnlColor(summary?.open_pnl ?? 0),
    },
    {
      label: "Win Rate",
      value: `${(stats?.win_rate ?? 0).toFixed(1)}%`,
      color: (stats?.win_rate ?? 0) >= 50 ? "var(--green)" : "var(--red)",
    },
    {
      label: "Profit Factor",
      value:
        stats?.profit_factor === Infinity
          ? "\u221E"
          : (stats?.profit_factor ?? 0).toFixed(2),
      color: undefined,
    },
    {
      label: "Max Drawdown",
      value: formatCurrency(summary?.max_drawdown ?? 0),
      sub: `${(summary?.max_drawdown_pct ?? 0).toFixed(1)}%`,
      color: "var(--red)",
    },
    {
      label: "Streak",
      value:
        (summary?.current_streak ?? 0) > 0
          ? `${summary?.current_streak}W`
          : (summary?.current_streak ?? 0) < 0
            ? `${Math.abs(summary?.current_streak ?? 0)}L`
            : "—",
      sub: `Best: ${summary?.longest_win_streak ?? 0}W`,
      color:
        (summary?.current_streak ?? 0) > 0
          ? "var(--green)"
          : (summary?.current_streak ?? 0) < 0
            ? "var(--red)"
            : undefined,
    },
  ];

  return (
    <div className="pt-journal-stats">
      {items.map((item) => (
        <div key={item.label} className="pt-journal-stat">
          <div
            className="pt-journal-stat-val"
            style={item.color ? { color: item.color } : undefined}
          >
            {item.value}
          </div>
          <div className="pt-journal-stat-label">{item.label}</div>
          {"sub" in item && item.sub && (
            <div className="pt-journal-stat-sub" style={{ color: "var(--g400)" }}>
              {item.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  SVG Equity Curve                                                    */
/* ================================================================== */

function EquityCurveChart({ data }: { data: EquityCurvePoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { points, width, height, minY, maxY, zeroY } = useMemo(() => {
    const w = 700;
    const h = 220;
    const pad = { top: 16, right: 16, bottom: 24, left: 16 };

    if (data.length === 0) return { points: "", width: w, height: h, minY: 0, maxY: 0, zeroY: h / 2 };

    const values = data.map((d) => d.cumulative_pnl);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const range = max - min || 1;

    const pts = data
      .map((d, i) => {
        const x = pad.left + (i / Math.max(data.length - 1, 1)) * (w - pad.left - pad.right);
        const y = pad.top + (1 - (d.cumulative_pnl - min) / range) * (h - pad.top - pad.bottom);
        return `${x},${y}`;
      })
      .join(" ");

    const zy = pad.top + (1 - (0 - min) / range) * (h - pad.top - pad.bottom);

    return { points: pts, width: w, height: h, minY: min, maxY: max, zeroY: zy };
  }, [data]);

  if (data.length < 2) {
    return (
      <div className="pt-card" style={{ padding: 32, textAlign: "center", color: "var(--g400)", fontSize: 14 }}>
        Need at least 2 closed trading days to show the equity curve.
      </div>
    );
  }

  const lastPnl = data[data.length - 1]?.cumulative_pnl ?? 0;
  const curveColor = lastPnl >= 0 ? "var(--green)" : "var(--red)";
  const gradientId = lastPnl >= 0 ? "eqGreen" : "eqRed";

  // Hoverable column width
  const colW = (width - 32) / data.length;

  const hovered = hoveredIdx != null ? data[hoveredIdx] : null;

  return (
    <div className="pt-card" style={{ padding: "16px 0 0 0", position: "relative" }}>
      <div style={{ padding: "0 20px 0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--black)", letterSpacing: "-0.2px" }}>
          EQUITY CURVE
        </div>
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
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={curveColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={curveColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Zero line */}
        <line
          x1={16}
          y1={zeroY}
          x2={width - 16}
          y2={zeroY}
          stroke="var(--g200)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* Fill area */}
        <polygon
          points={`16,${zeroY} ${points} ${width - 16},${zeroY}`}
          fill={`url(#${gradientId})`}
        />

        {/* Curve line */}
        <polyline
          points={points}
          fill="none"
          stroke={curveColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover columns */}
        {data.map((_, i) => {
          const x = 16 + (i / Math.max(data.length - 1, 1)) * (width - 32);
          return (
            <rect
              key={i}
              x={x - colW / 2}
              y={0}
              width={colW}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHoveredIdx(i)}
            />
          );
        })}

        {/* Hover dot */}
        {hoveredIdx != null && (
          <circle
            cx={16 + (hoveredIdx / Math.max(data.length - 1, 1)) * (width - 32)}
            cy={
              16 +
              (1 -
                (data[hoveredIdx].cumulative_pnl - (Math.min(0, ...data.map((d) => d.cumulative_pnl)))) /
                  ((Math.max(0, ...data.map((d) => d.cumulative_pnl)) - Math.min(0, ...data.map((d) => d.cumulative_pnl))) || 1)) *
                (height - 40)
            }
            r={5}
            fill={curveColor}
            stroke="var(--white)"
            strokeWidth={2}
          />
        )}
      </svg>
    </div>
  );
}

/* ================================================================== */
/*  Open Positions Table                                                */
/* ================================================================== */

function OpenPositions({ trades, isLoading }: { trades: Trade[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="pt-card" style={{ padding: 16 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ marginBottom: 8 }}><Skeleton width="100%" height={44} borderRadius={8} /></div>
        ))}
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="pt-card" style={{ padding: 28, textAlign: "center", color: "var(--g400)", fontSize: 14 }}>
        No open positions
      </div>
    );
  }

  return (
    <div className="pt-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--g100)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.2px" }}>
        OPEN POSITIONS ({trades.length})
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--g100)" }}>
              <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--g400)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>Pair</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--g400)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>Side</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--g400)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>Entry</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--g400)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>Lot</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--g400)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>SL</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--g400)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>TP</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--g400)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>P&L</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => {
              const dirColor = t.direction === "long" ? "var(--green)" : "var(--red)";
              return (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--g50)" }}>
                  <td style={{ padding: "10px 16px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{t.pair}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ color: dirColor, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>
                      {t.direction === "long" ? "BUY" : "SELL"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{t.entry_price}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{t.lot_size}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--g500)" }}>{t.stop_loss ?? "—"}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--g500)" }}>{t.take_profit ?? "—"}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, fontFamily: "var(--font-mono)", color: pnlColor(t.pnl ?? 0) }}>
                    {t.pnl != null ? `${pnlSign(t.pnl)}${formatCurrency(t.pnl)}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Pair Performance Table                                              */
/* ================================================================== */

function PairPerformance({ data, isLoading }: { data: PairBreakdown[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="pt-card" style={{ padding: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ marginBottom: 8 }}><Skeleton width="100%" height={36} borderRadius={8} /></div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="pt-card" style={{ padding: 28, textAlign: "center", color: "var(--g400)", fontSize: 14 }}>
        No closed trades yet
      </div>
    );
  }

  return (
    <div className="pt-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--g100)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.2px" }}>
        PAIR PERFORMANCE
      </div>
      <div style={{ padding: "8px 0" }}>
        {data.slice(0, 10).map((p) => (
          <div
            key={p.pair}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 20px",
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 13, minWidth: 85 }}>
              {p.pair}
            </div>
            {/* Win rate bar */}
            <div style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: "var(--g100)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${p.win_rate}%`,
                  height: "100%",
                  borderRadius: 4,
                  backgroundColor: p.total_pnl >= 0 ? "var(--lime)" : "var(--red)",
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: "var(--g500)", minWidth: 32, textAlign: "right" }}>
              {p.win_rate.toFixed(0)}%
            </div>
            <div style={{ fontSize: 12, color: "var(--g400)", minWidth: 24, textAlign: "right" }}>
              {p.trade_count}
            </div>
            <div
              style={{
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                minWidth: 75,
                textAlign: "right",
                color: pnlColor(p.total_pnl),
              }}
            >
              {pnlSign(p.total_pnl)}
              {formatCurrency(p.total_pnl)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Monthly Returns Grid                                                */
/* ================================================================== */

function MonthlyReturnsGrid({ data, isLoading }: { data: MonthlyReturn[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="pt-card" style={{ padding: 16 }}>
        <Skeleton width="100%" height={120} borderRadius={8} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="pt-card" style={{ padding: 28, textAlign: "center", color: "var(--g400)", fontSize: 14 }}>
        No monthly data yet
      </div>
    );
  }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="pt-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--g100)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.2px" }}>
        MONTHLY RETURNS
      </div>
      <div style={{ padding: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {data.map((m) => {
          const monthIdx = parseInt(m.month.split("-")[1], 10) - 1;
          const year = m.month.split("-")[0];
          const bg =
            m.pnl > 0
              ? "rgba(168,255,57,0.15)"
              : m.pnl < 0
                ? "rgba(255,68,68,0.1)"
                : "var(--g50)";
          return (
            <div
              key={m.month}
              style={{
                padding: "10px 14px",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--g100)",
                backgroundColor: bg,
                minWidth: 90,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--g400)", fontWeight: 600, marginBottom: 4 }}>
                {monthNames[monthIdx]} {year}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: pnlColor(m.pnl),
                }}
              >
                {pnlSign(m.pnl)}
                {formatCurrency(m.pnl)}
              </div>
              <div style={{ fontSize: 10, color: "var(--g400)", marginTop: 2 }}>
                {m.trade_count} trades &middot; {m.win_rate.toFixed(0)}% WR
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Main Page                                                           */
/* ================================================================== */

export default function PortfolioPage() {
  const supabase = createBrowserClient();
  const { data: session } = useSession(supabase);

  const { data: summary, isLoading: summaryLoading } = usePortfolioSummary(supabase);
  const { data: stats, isLoading: statsLoading } = useTradeStats(supabase);
  const { data: equityCurve, isLoading: curveLoading } = useEquityCurve(supabase);
  const { data: openPositions, isLoading: openLoading } = useOpenPositions(supabase);
  const { data: pairBreakdown, isLoading: pairLoading } = usePairBreakdown(supabase);
  const { data: monthlyReturns, isLoading: monthlyLoading } = useMonthlyReturns(supabase);

  const isEmpty = !summaryLoading && (summary?.open_positions ?? 0) === 0 && (summary?.closed_positions ?? 0) === 0;

  return (
    <div className="pt-container">
      <div className="pt-page-header">
        <h1 className="pt-page-title">Portfolio</h1>
        {summary && !isEmpty && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Badge variant={(summary.closed_positions + summary.open_positions) > 0 ? "green" : ""}>
              {summary.active_days} active days
            </Badge>
            {summary.first_trade_date && (
              <span style={{ fontSize: 12, color: "var(--g400)" }}>
                Since {new Date(summary.first_trade_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
            )}
          </div>
        )}
      </div>

      {isEmpty ? (
        <EmptyState
          icon={<IconChart size={40} />}
          title="No trades yet"
          description="Log your first trade in the Journal to start tracking your portfolio performance."
        />
      ) : (
        <>
          {/* Summary Stats */}
          <SummaryCards
            summary={summary}
            stats={stats}
            isLoading={summaryLoading || statsLoading}
          />

          {/* Main layout: 2 columns */}
          <div className="pt-feed-layout" style={{ marginTop: 20 }}>
            {/* Left column - main content */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <EquityCurveChart data={equityCurve ?? []} />
              <OpenPositions trades={openPositions ?? []} isLoading={openLoading} />
              <MonthlyReturnsGrid data={monthlyReturns ?? []} isLoading={monthlyLoading} />
            </div>

            {/* Right column - sidebar */}
            <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <PairPerformance data={pairBreakdown ?? []} isLoading={pairLoading} />

              {/* Quick metrics card */}
              {summary && (
                <div className="pt-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--g100)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.2px" }}>
                    QUICK STATS
                  </div>
                  <div style={{ padding: "8px 0" }}>
                    {[
                      { label: "Closed Trades", value: String(summary.closed_positions) },
                      { label: "Avg R:R", value: (stats?.avg_rr ?? 0).toFixed(2) },
                      { label: "Best Trade", value: formatCurrency(stats?.best_trade ?? 0), color: "var(--green)" },
                      { label: "Worst Trade", value: formatCurrency(stats?.worst_trade ?? 0), color: "var(--red)" },
                      { label: "Avg Win", value: formatCurrency(stats?.avg_win ?? 0), color: "var(--green)" },
                      { label: "Avg Loss", value: formatCurrency(stats?.avg_loss ?? 0), color: "var(--red)" },
                      { label: "Current DD", value: formatCurrency(summary.current_drawdown) },
                      { label: "Worst Loss Streak", value: `${summary.longest_loss_streak}` },
                    ].map((row) => (
                      <div
                        key={row.label}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "7px 20px",
                          fontSize: 13,
                        }}
                      >
                        <span style={{ color: "var(--g500)" }}>{row.label}</span>
                        <span
                          style={{
                            fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                            color: row.color ?? "var(--black)",
                          }}
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
