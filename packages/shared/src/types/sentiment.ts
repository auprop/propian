import type { Instrument } from "../constants/assets";

/* ─── Database Row Types ─── */

/** Row from the `sentiments` table — live snapshot per instrument */
export interface SentimentData {
  id: string;
  symbol: Instrument;
  long_pct: number;
  short_pct: number;
  positions: number;
  price: string;
  price_change: string;
  price_change_up: boolean;
  updated_at: string;
}

/** Row from the `sentiment_history` table — hourly snapshots */
export interface SentimentHistory {
  id: string;
  symbol: Instrument;
  long_pct: number;
  short_pct: number;
  positions: number;
  snapshot_at: string;
}

/* ─── Computed Types ─── */

/** Aggregated hero stats for the overview top cards */
export interface SentimentHero {
  community_bullish_pct: number;
  total_traders: number;
  most_traded_symbol: Instrument;
  most_traded_positions: number;
}

/** A bull/bear shift mover */
export interface SentimentMover {
  symbol: Instrument;
  shift: number;
  from_pct: number;
  to_pct: number;
  direction: "bull" | "bear";
}

/** Extreme reading (>70 or <30 long) */
export interface SentimentExtreme {
  symbol: Instrument;
  pct: number;
  side: "LONG" | "SHORT";
}

/** Sentiment vs price divergence */
export interface SentimentDivergence {
  symbol: Instrument;
  price_change: string;
  sentiment_pct: string;
  sentiment_side: "Long" | "Short";
  signal: string;
  bullish: boolean;
}

/* ─── Filter Types ─── */

export type AssetClass = "forex" | "crypto" | "indices" | "commodities";
export type SentimentPeriod = "live" | "1h" | "4h" | "1d";
export type HistoryPeriod = "1D" | "1W" | "1M" | "3M";
