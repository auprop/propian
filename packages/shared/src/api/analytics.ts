import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Trade,
  DayOfWeekStats,
  HourOfDayStats,
  DirectionStats,
  EmotionStats,
  SetupStats,
  MistakeStats,
  DrawdownPoint,
  WeeklyPnl,
  RiskRewardBucket,
} from "../types";

/* ─── Shared fetcher (all closed trades, optionally filtered) ─── */

async function getClosedTrades(
  supabase: SupabaseClient,
  dateFrom?: string,
  dateTo?: string
): Promise<Trade[]> {
  let query = supabase
    .from("trades")
    .select("*")
    .eq("status", "closed")
    .order("trade_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (dateFrom) query = query.gte("trade_date", dateFrom);
  if (dateTo) query = query.lte("trade_date", dateTo);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Trade[];
}

/* ─── Day of Week Analysis ─── */

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function getDayOfWeekStats(
  supabase: SupabaseClient,
  dateFrom?: string,
  dateTo?: string
): Promise<DayOfWeekStats[]> {
  const trades = await getClosedTrades(supabase, dateFrom, dateTo);

  const buckets = Array.from({ length: 7 }, (_, i) => ({
    day: i,
    day_name: DAY_NAMES[i],
    count: 0,
    wins: 0,
    pnl: 0,
  }));

  for (const t of trades) {
    const dow = new Date(t.trade_date + "T12:00:00").getDay();
    const pnl = t.pnl ?? 0;
    buckets[dow].count++;
    if (pnl > 0) buckets[dow].wins++;
    buckets[dow].pnl += pnl;
  }

  return buckets.map((b) => ({
    day: b.day,
    day_name: b.day_name,
    trade_count: b.count,
    win_count: b.wins,
    win_rate: b.count > 0 ? (b.wins / b.count) * 100 : 0,
    total_pnl: b.pnl,
    avg_pnl: b.count > 0 ? b.pnl / b.count : 0,
  }));
}

/* ─── Hour of Day Analysis ─── */

export async function getHourOfDayStats(
  supabase: SupabaseClient,
  dateFrom?: string,
  dateTo?: string
): Promise<HourOfDayStats[]> {
  const trades = await getClosedTrades(supabase, dateFrom, dateTo);

  const buckets = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0,
    wins: 0,
    pnl: 0,
  }));

  for (const t of trades) {
    // Use created_at timestamp for hour — trade entry time
    const hour = t.created_at ? new Date(t.created_at).getHours() : 12;
    const pnl = t.pnl ?? 0;
    buckets[hour].count++;
    if (pnl > 0) buckets[hour].wins++;
    buckets[hour].pnl += pnl;
  }

  return buckets.map((b) => ({
    hour: b.hour,
    trade_count: b.count,
    win_count: b.wins,
    win_rate: b.count > 0 ? (b.wins / b.count) * 100 : 0,
    total_pnl: b.pnl,
  }));
}

/* ─── Direction Breakdown ─── */

export async function getDirectionStats(
  supabase: SupabaseClient,
  dateFrom?: string,
  dateTo?: string
): Promise<DirectionStats[]> {
  const trades = await getClosedTrades(supabase, dateFrom, dateTo);

  const map = new Map<string, { count: number; wins: number; pnl: number; rrs: number[]; best: number; worst: number }>();

  for (const t of trades) {
    const dir = t.direction;
    const pnl = t.pnl ?? 0;
    const existing = map.get(dir) ?? { count: 0, wins: 0, pnl: 0, rrs: [], best: -Infinity, worst: Infinity };
    existing.count++;
    if (pnl > 0) existing.wins++;
    existing.pnl += pnl;
    if (t.rr_ratio != null) existing.rrs.push(t.rr_ratio);
    if (pnl > existing.best) existing.best = pnl;
    if (pnl < existing.worst) existing.worst = pnl;
    map.set(dir, existing);
  }

  return (["long", "short"] as const).map((dir) => {
    const d = map.get(dir) ?? { count: 0, wins: 0, pnl: 0, rrs: [], best: 0, worst: 0 };
    return {
      direction: dir,
      trade_count: d.count,
      win_count: d.wins,
      win_rate: d.count > 0 ? (d.wins / d.count) * 100 : 0,
      total_pnl: d.pnl,
      avg_pnl: d.count > 0 ? d.pnl / d.count : 0,
      avg_rr: d.rrs.length > 0 ? d.rrs.reduce((a, b) => a + b, 0) / d.rrs.length : 0,
      best_trade: d.best === -Infinity ? 0 : d.best,
      worst_trade: d.worst === Infinity ? 0 : d.worst,
    };
  });
}

/* ─── Emotion Analysis ─── */

export async function getEmotionStats(
  supabase: SupabaseClient,
  dateFrom?: string,
  dateTo?: string
): Promise<EmotionStats[]> {
  const trades = await getClosedTrades(supabase, dateFrom, dateTo);

  const map = new Map<string, { count: number; wins: number; pnl: number }>();
  for (const t of trades) {
    if (!t.emotion) continue;
    const existing = map.get(t.emotion) ?? { count: 0, wins: 0, pnl: 0 };
    existing.count++;
    if ((t.pnl ?? 0) > 0) existing.wins++;
    existing.pnl += t.pnl ?? 0;
    map.set(t.emotion, existing);
  }

  const emotions = ["confident", "neutral", "fearful", "greedy", "revenge"] as const;
  return emotions
    .filter((e) => map.has(e))
    .map((emotion) => {
      const d = map.get(emotion)!;
      return {
        emotion,
        trade_count: d.count,
        win_count: d.wins,
        win_rate: d.count > 0 ? (d.wins / d.count) * 100 : 0,
        total_pnl: d.pnl,
        avg_pnl: d.count > 0 ? d.pnl / d.count : 0,
      };
    })
    .sort((a, b) => b.trade_count - a.trade_count);
}

/* ─── Setup Analysis ─── */

export async function getSetupStats(
  supabase: SupabaseClient,
  dateFrom?: string,
  dateTo?: string
): Promise<SetupStats[]> {
  const trades = await getClosedTrades(supabase, dateFrom, dateTo);

  const map = new Map<string, { count: number; wins: number; pnl: number }>();
  for (const t of trades) {
    if (!t.setup) continue;
    const existing = map.get(t.setup) ?? { count: 0, wins: 0, pnl: 0 };
    existing.count++;
    if ((t.pnl ?? 0) > 0) existing.wins++;
    existing.pnl += t.pnl ?? 0;
    map.set(t.setup, existing);
  }

  return Array.from(map.entries())
    .map(([setup, d]) => ({
      setup,
      trade_count: d.count,
      win_count: d.wins,
      win_rate: d.count > 0 ? (d.wins / d.count) * 100 : 0,
      total_pnl: d.pnl,
    }))
    .sort((a, b) => b.trade_count - a.trade_count);
}

/* ─── Common Mistakes ─── */

export async function getMistakeStats(
  supabase: SupabaseClient,
  dateFrom?: string,
  dateTo?: string
): Promise<MistakeStats[]> {
  const trades = await getClosedTrades(supabase, dateFrom, dateTo);

  const map = new Map<string, { count: number; pnl: number }>();
  for (const t of trades) {
    for (const m of t.mistakes) {
      const existing = map.get(m) ?? { count: 0, pnl: 0 };
      existing.count++;
      existing.pnl += t.pnl ?? 0;
      map.set(m, existing);
    }
  }

  return Array.from(map.entries())
    .map(([mistake, d]) => ({
      mistake,
      count: d.count,
      total_pnl: d.pnl,
    }))
    .sort((a, b) => b.count - a.count);
}

/* ─── Drawdown Curve ─── */

export async function getDrawdownCurve(
  supabase: SupabaseClient,
  dateFrom?: string,
  dateTo?: string
): Promise<DrawdownPoint[]> {
  const trades = await getClosedTrades(supabase, dateFrom, dateTo);

  const dayMap = new Map<string, number>();
  for (const t of trades) {
    dayMap.set(t.trade_date, (dayMap.get(t.trade_date) ?? 0) + (t.pnl ?? 0));
  }

  const points: DrawdownPoint[] = [];
  let cumPnl = 0;
  let peak = 0;

  for (const [date, pnl] of dayMap) {
    cumPnl += pnl;
    if (cumPnl > peak) peak = cumPnl;
    const dd = peak - cumPnl;
    points.push({
      date,
      drawdown: dd,
      drawdown_pct: peak > 0 ? (dd / peak) * 100 : 0,
    });
  }

  return points;
}

/* ─── Weekly P&L ─── */

export async function getWeeklyPnl(
  supabase: SupabaseClient,
  dateFrom?: string,
  dateTo?: string
): Promise<WeeklyPnl[]> {
  const trades = await getClosedTrades(supabase, dateFrom, dateTo);

  // Group by ISO week start (Monday)
  const weekMap = new Map<string, { pnl: number; count: number; wins: number }>();
  for (const t of trades) {
    const d = new Date(t.trade_date + "T12:00:00");
    // Get Monday of that week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const weekStart = monday.toISOString().split("T")[0];

    const pnl = t.pnl ?? 0;
    const existing = weekMap.get(weekStart) ?? { pnl: 0, count: 0, wins: 0 };
    existing.pnl += pnl;
    existing.count++;
    if (pnl > 0) existing.wins++;
    weekMap.set(weekStart, existing);
  }

  return Array.from(weekMap.entries())
    .map(([week_start, d]) => ({
      week_start,
      pnl: d.pnl,
      trade_count: d.count,
      win_rate: d.count > 0 ? (d.wins / d.count) * 100 : 0,
    }))
    .sort((a, b) => a.week_start.localeCompare(b.week_start));
}

/* ─── Risk:Reward Distribution ─── */

export async function getRiskRewardDistribution(
  supabase: SupabaseClient,
  dateFrom?: string,
  dateTo?: string
): Promise<RiskRewardBucket[]> {
  const trades = await getClosedTrades(supabase, dateFrom, dateTo);

  const buckets: { label: string; min: number; max: number; count: number; wins: number }[] = [
    { label: "< 1:1", min: -Infinity, max: 1, count: 0, wins: 0 },
    { label: "1:1 – 2:1", min: 1, max: 2, count: 0, wins: 0 },
    { label: "2:1 – 3:1", min: 2, max: 3, count: 0, wins: 0 },
    { label: "3:1+", min: 3, max: Infinity, count: 0, wins: 0 },
  ];

  for (const t of trades) {
    if (t.rr_ratio == null) continue;
    const rr = t.rr_ratio;
    const pnl = t.pnl ?? 0;
    for (const b of buckets) {
      if (rr >= b.min && rr < b.max) {
        b.count++;
        if (pnl > 0) b.wins++;
        break;
      }
    }
  }

  return buckets.map((b) => ({
    bucket: b.label,
    count: b.count,
    win_count: b.wins,
    win_rate: b.count > 0 ? (b.wins / b.count) * 100 : 0,
  }));
}
