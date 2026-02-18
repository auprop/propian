import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Trade,
  EquityCurvePoint,
  PairBreakdown,
  MonthlyReturn,
  PortfolioSummary,
} from "../types";

/* ─── Open positions ─── */

export async function getOpenPositions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("status", "open")
    .order("trade_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Trade[];
}

/* ─── Equity Curve ─── */

export async function getEquityCurve(supabase: SupabaseClient): Promise<EquityCurvePoint[]> {
  const { data, error } = await supabase
    .from("trades")
    .select("trade_date, pnl")
    .eq("status", "closed")
    .order("trade_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;

  const dayMap = new Map<string, { pnl: number; count: number }>();
  for (const row of data ?? []) {
    const existing = dayMap.get(row.trade_date) ?? { pnl: 0, count: 0 };
    dayMap.set(row.trade_date, {
      pnl: existing.pnl + (row.pnl ?? 0),
      count: existing.count + 1,
    });
  }

  const points: EquityCurvePoint[] = [];
  let cumPnl = 0;
  for (const [date, val] of dayMap) {
    cumPnl += val.pnl;
    points.push({ date, cumulative_pnl: cumPnl, trade_count: val.count });
  }
  return points;
}

/* ─── Pair Breakdown ─── */

export async function getPairBreakdown(supabase: SupabaseClient): Promise<PairBreakdown[]> {
  const { data, error } = await supabase
    .from("trades")
    .select("pair, pnl")
    .eq("status", "closed");
  if (error) throw error;

  const pairMap = new Map<string, { wins: number; losses: number; pnl: number; count: number }>();
  for (const row of data ?? []) {
    const existing = pairMap.get(row.pair) ?? { wins: 0, losses: 0, pnl: 0, count: 0 };
    const pnl = row.pnl ?? 0;
    pairMap.set(row.pair, {
      wins: existing.wins + (pnl > 0 ? 1 : 0),
      losses: existing.losses + (pnl < 0 ? 1 : 0),
      pnl: existing.pnl + pnl,
      count: existing.count + 1,
    });
  }

  return Array.from(pairMap.entries())
    .map(([pair, val]) => ({
      pair,
      trade_count: val.count,
      win_count: val.wins,
      loss_count: val.losses,
      win_rate: val.count > 0 ? (val.wins / val.count) * 100 : 0,
      total_pnl: val.pnl,
      avg_pnl: val.count > 0 ? val.pnl / val.count : 0,
    }))
    .sort((a, b) => b.trade_count - a.trade_count);
}

/* ─── Monthly Returns ─── */

export async function getMonthlyReturns(supabase: SupabaseClient): Promise<MonthlyReturn[]> {
  const { data, error } = await supabase
    .from("trades")
    .select("trade_date, pnl")
    .eq("status", "closed")
    .order("trade_date", { ascending: true });
  if (error) throw error;

  const monthMap = new Map<string, { pnl: number; count: number; wins: number }>();
  for (const row of data ?? []) {
    const month = row.trade_date.slice(0, 7); // "YYYY-MM"
    const existing = monthMap.get(month) ?? { pnl: 0, count: 0, wins: 0 };
    const pnl = row.pnl ?? 0;
    monthMap.set(month, {
      pnl: existing.pnl + pnl,
      count: existing.count + 1,
      wins: existing.wins + (pnl > 0 ? 1 : 0),
    });
  }

  return Array.from(monthMap.entries()).map(([month, val]) => ({
    month,
    pnl: val.pnl,
    trade_count: val.count,
    win_rate: val.count > 0 ? (val.wins / val.count) * 100 : 0,
  }));
}

/* ─── Portfolio Summary ─── */

export async function getPortfolioSummary(supabase: SupabaseClient): Promise<PortfolioSummary> {
  // Get all trades
  const { data, error } = await supabase
    .from("trades")
    .select("pnl, status, trade_date, closed_at")
    .order("trade_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;

  const trades = data ?? [];
  const open = trades.filter((t) => t.status === "open");
  const closed = trades.filter((t) => t.status === "closed");

  const closedPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const openPnl = open.reduce((s, t) => s + (t.pnl ?? 0), 0);

  // Drawdown calculation from equity curve
  let peak = 0;
  let cumPnl = 0;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  for (const t of closed) {
    cumPnl += t.pnl ?? 0;
    if (cumPnl > peak) peak = cumPnl;
    const dd = peak - cumPnl;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
      maxDrawdownPct = peak > 0 ? (dd / peak) * 100 : 0;
    }
  }
  const currentDrawdown = peak - cumPnl;

  // Streak calculation
  let currentStreak = 0;
  let longestWin = 0;
  let longestLoss = 0;
  let tempWin = 0;
  let tempLoss = 0;
  for (const t of closed) {
    const pnl = t.pnl ?? 0;
    if (pnl > 0) {
      tempWin++;
      tempLoss = 0;
      if (tempWin > longestWin) longestWin = tempWin;
      currentStreak = tempWin;
    } else if (pnl < 0) {
      tempLoss++;
      tempWin = 0;
      if (tempLoss > longestLoss) longestLoss = tempLoss;
      currentStreak = -tempLoss;
    } else {
      tempWin = 0;
      tempLoss = 0;
      currentStreak = 0;
    }
  }

  // Active days
  const uniqueDays = new Set(closed.map((t) => t.trade_date));

  const allDates = trades.map((t) => t.trade_date).filter(Boolean);
  const firstDate = allDates.length > 0 ? allDates[0] : null;
  const lastDate = allDates.length > 0 ? allDates[allDates.length - 1] : null;

  return {
    total_pnl: closedPnl + openPnl,
    open_pnl: openPnl,
    closed_pnl: closedPnl,
    open_positions: open.length,
    closed_positions: closed.length,
    max_drawdown: maxDrawdown,
    max_drawdown_pct: maxDrawdownPct,
    current_drawdown: currentDrawdown,
    current_streak: currentStreak,
    longest_win_streak: longestWin,
    longest_loss_streak: longestLoss,
    first_trade_date: firstDate,
    last_trade_date: lastDate,
    active_days: uniqueDays.size,
  };
}
