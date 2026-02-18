import type { SupabaseClient } from "@supabase/supabase-js";
import type { Trade, TradeStats, TradeHeatmapDay, TradeFilter, PaginatedResponse } from "../types";

const PAGE_SIZE = 20;

export async function getTrades(
  supabase: SupabaseClient,
  cursor?: string,
  filters?: TradeFilter
): Promise<PaginatedResponse<Trade>> {
  let query = supabase
    .from("trades")
    .select("*")
    .order("trade_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.pair) {
    query = query.eq("pair", filters.pair);
  }
  if (filters?.direction) {
    query = query.eq("direction", filters.direction);
  }
  if (filters?.dateFrom) {
    query = query.gte("trade_date", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("trade_date", filters.dateTo);
  }

  const { data, error } = await query;
  if (error) throw error;

  const hasMore = (data?.length ?? 0) > PAGE_SIZE;
  const trades = hasMore ? data!.slice(0, PAGE_SIZE) : (data ?? []);

  return {
    data: trades as Trade[],
    nextCursor: hasMore ? trades[trades.length - 1].created_at : null,
    hasMore,
  };
}

export async function logTrade(
  supabase: SupabaseClient,
  trade: Omit<Trade, "id" | "user_id" | "created_at" | "updated_at">
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("trades")
    .insert({ ...trade, user_id: user.id })
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message || `DB error: ${error.code} — ${error.details}`);
  }
  return data as Trade;
}

export async function updateTrade(
  supabase: SupabaseClient,
  tradeId: string,
  updates: Partial<Trade>
) {
  const { data, error } = await supabase
    .from("trades")
    .update(updates)
    .eq("id", tradeId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Trade;
}

export async function deleteTrade(
  supabase: SupabaseClient,
  tradeId: string
) {
  const { error } = await supabase
    .from("trades")
    .delete()
    .eq("id", tradeId);
  if (error) throw error;
}

export async function getTradeStats(
  supabase: SupabaseClient,
  filters?: TradeFilter
): Promise<TradeStats> {
  let query = supabase
    .from("trades")
    .select("pnl, rr_ratio, status")
    .eq("status", "closed");

  if (filters?.pair) {
    query = query.eq("pair", filters.pair);
  }
  if (filters?.dateFrom) {
    query = query.gte("trade_date", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("trade_date", filters.dateTo);
  }

  const { data, error } = await query;
  if (error) throw error;

  const trades = data ?? [];
  const wins = trades.filter((t) => (t.pnl ?? 0) > 0);
  const losses = trades.filter((t) => (t.pnl ?? 0) < 0);
  const breakevens = trades.filter((t) => (t.pnl ?? 0) === 0);

  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const totalWins = wins.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const totalLosses = Math.abs(losses.reduce((sum, t) => sum + (t.pnl ?? 0), 0));
  const rrValues = trades.filter((t) => t.rr_ratio != null).map((t) => t.rr_ratio as number);

  return {
    total_trades: trades.length,
    win_count: wins.length,
    loss_count: losses.length,
    breakeven_count: breakevens.length,
    win_rate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
    total_pnl: totalPnl,
    avg_pnl: trades.length > 0 ? totalPnl / trades.length : 0,
    avg_rr: rrValues.length > 0 ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length : 0,
    best_trade: trades.length > 0 ? Math.max(...trades.map((t) => t.pnl ?? 0)) : 0,
    worst_trade: trades.length > 0 ? Math.min(...trades.map((t) => t.pnl ?? 0)) : 0,
    profit_factor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
    avg_win: wins.length > 0 ? totalWins / wins.length : 0,
    avg_loss: losses.length > 0 ? totalLosses / losses.length : 0,
  };
}

export async function getDayTrades(
  supabase: SupabaseClient,
  date: string
): Promise<Trade[]> {
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("trade_date", date)
    .eq("status", "closed")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Trade[];
}

export async function getTradeHeatmap(
  supabase: SupabaseClient,
  year: number,
  month: number
): Promise<TradeHeatmapDay[]> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const { data, error } = await supabase
    .from("trades")
    .select("trade_date, pnl")
    .gte("trade_date", startDate)
    .lt("trade_date", endDate)
    .eq("status", "closed");
  if (error) throw error;

  const dayMap = new Map<string, { count: number; pnl: number }>();
  for (const row of data ?? []) {
    const existing = dayMap.get(row.trade_date) ?? { count: 0, pnl: 0 };
    dayMap.set(row.trade_date, {
      count: existing.count + 1,
      pnl: existing.pnl + (row.pnl ?? 0),
    });
  }

  return Array.from(dayMap.entries()).map(([date, val]) => ({
    date,
    trade_count: val.count,
    pnl: val.pnl,
  }));
}
