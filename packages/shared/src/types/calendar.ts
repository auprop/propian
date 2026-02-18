/* ─── Economic Calendar Types ─── */

export type EventImpact = "high" | "medium" | "low";
export type EventCountry = "us" | "eu" | "gb" | "jp" | "au" | "ca" | "ch" | "nz" | "cn";

export type EventSentiment = "bullish" | "bearish" | "neutral";

export interface EventAnalysis {
  summary: string;         // "Came in below expectations (4.3% vs 4.6% forecast)"
  marketImpact: string;    // "GBP likely to weaken as lower wage growth reduces BOE rate hike pressure"
  tradingInsight: string;  // "Watch GBP/USD for short opportunities near resistance levels"
  sentiment: EventSentiment;
}

export interface EventNotes {
  bullets: string[];                // Post-release bullet-point summary
  keyTakeaway: string;              // Single-sentence key takeaway
  affectedPairs: string[];          // ["GBP/USD", "EUR/GBP"]
  priceAction: EventSentiment;      // "bullish" | "bearish" | "neutral"
  generatedAt: string;              // ISO timestamp
}

export interface EconomicEvent {
  id: string;
  date: string;            // YYYY-MM-DD
  time: string;            // HH:mm (24h)
  country: EventCountry;
  currency: string;        // USD, EUR, GBP, etc.
  name: string;            // "Core CPI (MoM)"
  impact: EventImpact;
  actual: string | null;   // "0.3%"
  forecast: string | null; // "0.2%"
  previous: string | null; // "0.2%"
  actualDirection: "positive" | "negative" | null;
  description: string;
  tags: string[];
  history: number[];       // 12-month sparkline values (0-100)
  analysis: EventAnalysis | null;
  notes: EventNotes | null;
}

export interface CalendarDayEvents {
  date: string;
  events: EconomicEvent[];
}

export interface CalendarWeekDay {
  day: string;    // "Mon", "Tue", etc.
  num: number;    // 9, 10, etc.
  date: string;   // "YYYY-MM-DD"
  events: EventImpact[];
  today?: boolean;
}

export interface EventAlert {
  eventId: string;
  country: EventCountry;
  currency: string;
  name: string;
  impact: EventImpact;
  nextDate: string;
  frequency: string;
  enabled: boolean;
}

export interface CalendarFilter {
  impact: "all" | EventImpact;
  country: "all" | EventCountry;
  dateFrom?: string;
  dateTo?: string;
}

export const COUNTRY_FLAGS: Record<EventCountry | "all", string> = {
  all: "\uD83C\uDF0D",
  us: "\uD83C\uDDFA\uD83C\uDDF8",
  eu: "\uD83C\uDDEA\uD83C\uDDFA",
  gb: "\uD83C\uDDEC\uD83C\uDDE7",
  jp: "\uD83C\uDDEF\uD83C\uDDF5",
  au: "\uD83C\uDDE6\uD83C\uDDFA",
  ca: "\uD83C\uDDE8\uD83C\uDDE6",
  ch: "\uD83C\uDDE8\uD83C\uDDED",
  nz: "\uD83C\uDDF3\uD83C\uDDFF",
  cn: "\uD83C\uDDE8\uD83C\uDDF3",
};

export const COUNTRY_LABELS: Record<EventCountry | "all", string> = {
  all: "All",
  us: "USD",
  eu: "EUR",
  gb: "GBP",
  jp: "JPY",
  au: "AUD",
  ca: "CAD",
  ch: "CHF",
  nz: "NZD",
  cn: "CNY",
};
