export const forexPairs = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD",
  "USDCAD", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY",
  "EURCHF", "EURAUD", "GBPAUD", "AUDJPY", "CADJPY",
] as const;

export const metals = [
  "XAUUSD", "XAGUSD",
] as const;

export const indices = [
  "US30", "US500", "NAS100", "UK100", "GER40", "JPN225",
] as const;

export const crypto = [
  "BTCUSD", "ETHUSD", "SOLUSD",
] as const;

export const allInstruments = [
  ...forexPairs, ...metals, ...indices, ...crypto,
] as const;

export type Instrument = (typeof allInstruments)[number];

/** Display metadata for each instrument (icon label + brand color) */
export const INSTRUMENT_META: Record<
  Instrument,
  { label: string; color: string }
> = {
  // Forex
  EURUSD: { label: "€$", color: "#2962ff" },
  GBPUSD: { label: "£$", color: "#1565c0" },
  USDJPY: { label: "$¥", color: "#ff6d00" },
  USDCHF: { label: "UC", color: "#00bcd4" },
  AUDUSD: { label: "A$", color: "#00c853" },
  USDCAD: { label: "CA", color: "#ff1744" },
  NZDUSD: { label: "N$", color: "#6200ea" },
  EURGBP: { label: "EG", color: "#304ffe" },
  EURJPY: { label: "EJ", color: "#ff9100" },
  GBPJPY: { label: "GJ", color: "#c51162" },
  EURCHF: { label: "EC", color: "#00bfa5" },
  EURAUD: { label: "EA", color: "#1de9b6" },
  GBPAUD: { label: "GA", color: "#aa00ff" },
  AUDJPY: { label: "AJ", color: "#64dd17" },
  CADJPY: { label: "CJ", color: "#dd2c00" },
  // Metals
  XAUUSD: { label: "Au", color: "#fbbf24" },
  XAGUSD: { label: "Ag", color: "#78909c" },
  // Indices
  US30: { label: "DJ", color: "#1565c0" },
  US500: { label: "SP", color: "#c62828" },
  NAS100: { label: "NQ", color: "#00c853" },
  UK100: { label: "UK", color: "#283593" },
  GER40: { label: "DE", color: "#ef6c00" },
  JPN225: { label: "NK", color: "#ad1457" },
  // Crypto
  BTCUSD: { label: "₿", color: "#f7931a" },
  ETHUSD: { label: "Ξ", color: "#627eea" },
  SOLUSD: { label: "◎", color: "#9945ff" },
};

/** Asset class groupings for filtering */
export const ASSET_CLASSES = {
  forex: forexPairs,
  crypto: crypto,
  indices: indices,
  commodities: metals,
} as const;

export type AssetClassKey = keyof typeof ASSET_CLASSES;
