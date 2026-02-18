import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SentimentData,
  SentimentHistory,
  SentimentHero,
  SentimentMover,
  SentimentExtreme,
  SentimentDivergence,
  AssetClass,
} from "../types";
import { ASSET_CLASSES } from "../constants/assets";

/* ─── Queries ─── */

/** Fetch all live sentiments, optionally filtered by asset class */
export async function getSentiments(
  supabase: SupabaseClient,
  assetClass?: AssetClass,
): Promise<SentimentData[]> {
  let query = supabase
    .from("sentiments")
    .select("*")
    .order("positions", { ascending: false });

  if (assetClass) {
    const symbols = [...ASSET_CLASSES[assetClass]];
    query = query.in("symbol", symbols);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as SentimentData[];
}

/** Fetch sentiment history for a single instrument */
export async function getSentimentHistory(
  supabase: SupabaseClient,
  symbol: string,
  limit = 24,
): Promise<SentimentHistory[]> {
  const { data, error } = await supabase
    .from("sentiment_history")
    .select("*")
    .eq("symbol", symbol)
    .order("snapshot_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  // Reverse to chronological order for charts
  return (data as SentimentHistory[]).reverse();
}

/** Compute aggregated hero stats */
export async function getSentimentHero(
  supabase: SupabaseClient,
): Promise<SentimentHero> {
  const { data, error } = await supabase.from("sentiments").select("*");
  if (error) throw new Error(error.message);

  const sentiments = data as SentimentData[];
  const totalPositions = sentiments.reduce((s, d) => s + d.positions, 0);
  const weightedBullish = sentiments.reduce(
    (s, d) => s + d.long_pct * d.positions,
    0,
  );
  const communityBullish =
    totalPositions > 0 ? Math.round(weightedBullish / totalPositions) : 50;
  const mostTraded = sentiments.reduce(
    (max, d) => (d.positions > max.positions ? d : max),
    sentiments[0],
  );

  return {
    community_bullish_pct: communityBullish,
    total_traders: totalPositions,
    most_traded_symbol: mostTraded.symbol,
    most_traded_positions: mostTraded.positions,
  };
}

/* ─── Client-side derived helpers ─── */

/** Compute biggest bull/bear shifts by comparing current vs oldest history snapshot */
export function computeMovers(
  sentiments: SentimentData[],
  history: SentimentHistory[],
): { bulls: SentimentMover[]; bears: SentimentMover[] } {
  const oldest = new Map<string, number>();
  // Group history by symbol, take the oldest snapshot's long_pct
  for (const h of history) {
    if (!oldest.has(h.symbol)) {
      oldest.set(h.symbol, h.long_pct);
    }
  }

  const movers: SentimentMover[] = [];
  for (const s of sentiments) {
    const prev = oldest.get(s.symbol);
    if (prev == null) continue;
    const shift = s.long_pct - prev;
    if (Math.abs(shift) >= 1) {
      movers.push({
        symbol: s.symbol,
        shift: Math.abs(shift),
        from_pct: Math.round(prev),
        to_pct: Math.round(s.long_pct),
        direction: shift > 0 ? "bull" : "bear",
      });
    }
  }

  const bulls = movers
    .filter((m) => m.direction === "bull")
    .sort((a, b) => b.shift - a.shift)
    .slice(0, 3);
  const bears = movers
    .filter((m) => m.direction === "bear")
    .sort((a, b) => b.shift - a.shift)
    .slice(0, 3);

  return { bulls, bears };
}

/** Find instruments with extreme sentiment (>70 long or >70 short) */
export function computeExtremes(
  sentiments: SentimentData[],
): SentimentExtreme[] {
  return sentiments
    .filter((s) => s.long_pct >= 70 || s.short_pct >= 70)
    .map((s) => ({
      symbol: s.symbol,
      pct: s.long_pct >= 70 ? Math.round(s.long_pct) : Math.round(s.short_pct),
      side: (s.long_pct >= 70 ? "LONG" : "SHORT") as "LONG" | "SHORT",
    }))
    .sort((a, b) => b.pct - a.pct);
}

/** Detect sentiment vs price divergences */
export function computeDivergences(
  sentiments: SentimentData[],
): SentimentDivergence[] {
  return sentiments
    .filter((s) => {
      const majorityLong = s.long_pct > 55;
      const majorityShort = s.short_pct > 55;
      // Divergence = price going up but majority short, or price down but majority long
      return (
        (s.price_change_up && majorityShort) ||
        (!s.price_change_up && majorityLong)
      );
    })
    .map((s) => {
      const majorityLong = s.long_pct > 55;
      return {
        symbol: s.symbol,
        price_change: s.price_change,
        sentiment_pct: majorityLong
          ? `${Math.round(s.long_pct)}% Long`
          : `${Math.round(s.short_pct)}% Short`,
        sentiment_side: (majorityLong ? "Long" : "Short") as "Long" | "Short",
        signal: majorityLong ? "Bullish Divergence" : "Bearish Divergence",
        bullish: majorityLong,
      };
    })
    .slice(0, 4);
}
