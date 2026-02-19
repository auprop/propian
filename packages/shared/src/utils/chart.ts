import type { ChartInterval } from "../constants/symbols";

export interface ParsedChartRef {
  exchange: string;
  symbol: string;
  interval: ChartInterval;
}

/**
 * Parse a tv:// media URL into its components.
 * Format: tv://EXCHANGE:SYMBOL:INTERVAL
 * Example: tv://FX:EURUSD:D
 */
export function parseChartRef(mediaUrl: string): ParsedChartRef | null {
  if (!mediaUrl.startsWith("tv://")) return null;
  const parts = mediaUrl.slice(5).split(":");
  if (parts.length !== 3) return null;
  return {
    exchange: parts[0],
    symbol: parts[1],
    interval: parts[2] as ChartInterval,
  };
}

/**
 * Build a tv:// media URL from components.
 */
export function buildChartRef(
  exchange: string,
  symbol: string,
  interval: ChartInterval,
): string {
  return `tv://${exchange}:${symbol}:${interval}`;
}

/**
 * Build the TradingView Mini Chart Widget URL (for thumbnails in feed).
 */
export function buildMiniChartUrl(ref: ParsedChartRef): string {
  const tvSymbol = `${ref.exchange}:${ref.symbol}`;
  return `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol)}&interval=${ref.interval}&theme=light&style=1&locale=en&toolbarbg=ffffff&hide_top_toolbar=1&hide_legend=1&save_image=0&hide_volume=1&width=400&height=220`;
}

/**
 * Build the TradingView Advanced Chart Widget URL (for full interactive view).
 */
export function buildFullChartUrl(ref: ParsedChartRef): string {
  const tvSymbol = `${ref.exchange}:${ref.symbol}`;
  return `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol)}&interval=${ref.interval}&theme=light&style=1&locale=en&toolbarbg=ffffff&save_image=0&width=800&height=600`;
}

/**
 * Format a chart reference for display: "EURUSD · Daily"
 */
export function formatChartLabel(ref: ParsedChartRef): string {
  const intervalLabels: Record<string, string> = {
    "1": "1min",
    "5": "5min",
    "15": "15min",
    "60": "1H",
    "240": "4H",
    D: "Daily",
    W: "Weekly",
  };
  return `${ref.symbol} \u00B7 ${intervalLabels[ref.interval] || ref.interval}`;
}
