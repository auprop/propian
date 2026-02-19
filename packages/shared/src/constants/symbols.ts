export interface TradingSymbol {
  symbol: string;
  exchange: string;
  name: string;
  category: SymbolCategory;
}

export type SymbolCategory = "forex" | "crypto" | "indices" | "stocks";
export type ChartInterval = "1" | "5" | "15" | "60" | "240" | "D" | "W";

export const CHART_INTERVALS: { value: ChartInterval; label: string }[] = [
  { value: "1", label: "1m" },
  { value: "5", label: "5m" },
  { value: "15", label: "15m" },
  { value: "60", label: "1H" },
  { value: "240", label: "4H" },
  { value: "D", label: "1D" },
  { value: "W", label: "1W" },
];

export const SYMBOL_CATEGORIES: { value: SymbolCategory; label: string }[] = [
  { value: "forex", label: "Forex" },
  { value: "crypto", label: "Crypto" },
  { value: "indices", label: "Indices" },
  { value: "stocks", label: "Stocks" },
];

export const TRADING_SYMBOLS: TradingSymbol[] = [
  // Forex
  { symbol: "EURUSD", exchange: "FX", name: "Euro / US Dollar", category: "forex" },
  { symbol: "GBPUSD", exchange: "FX", name: "British Pound / US Dollar", category: "forex" },
  { symbol: "USDJPY", exchange: "FX", name: "US Dollar / Japanese Yen", category: "forex" },
  { symbol: "USDCHF", exchange: "FX", name: "US Dollar / Swiss Franc", category: "forex" },
  { symbol: "AUDUSD", exchange: "FX", name: "Australian Dollar / US Dollar", category: "forex" },
  { symbol: "USDCAD", exchange: "FX", name: "US Dollar / Canadian Dollar", category: "forex" },
  { symbol: "NZDUSD", exchange: "FX", name: "New Zealand Dollar / US Dollar", category: "forex" },
  { symbol: "EURGBP", exchange: "FX", name: "Euro / British Pound", category: "forex" },
  { symbol: "EURJPY", exchange: "FX", name: "Euro / Japanese Yen", category: "forex" },
  { symbol: "GBPJPY", exchange: "FX", name: "British Pound / Japanese Yen", category: "forex" },
  { symbol: "XAUUSD", exchange: "TVC", name: "Gold / US Dollar", category: "forex" },
  { symbol: "XAGUSD", exchange: "TVC", name: "Silver / US Dollar", category: "forex" },

  // Crypto
  { symbol: "BTCUSD", exchange: "BITSTAMP", name: "Bitcoin / US Dollar", category: "crypto" },
  { symbol: "ETHUSD", exchange: "BITSTAMP", name: "Ethereum / US Dollar", category: "crypto" },
  { symbol: "SOLUSD", exchange: "COINBASE", name: "Solana / US Dollar", category: "crypto" },
  { symbol: "XRPUSD", exchange: "BITSTAMP", name: "Ripple / US Dollar", category: "crypto" },
  { symbol: "ADAUSD", exchange: "BITSTAMP", name: "Cardano / US Dollar", category: "crypto" },
  { symbol: "DOGEUSD", exchange: "BITSTAMP", name: "Dogecoin / US Dollar", category: "crypto" },

  // Indices
  { symbol: "SPX", exchange: "SP", name: "S&P 500", category: "indices" },
  { symbol: "DJI", exchange: "TVC", name: "Dow Jones Industrial", category: "indices" },
  { symbol: "IXIC", exchange: "NASDAQ", name: "NASDAQ Composite", category: "indices" },
  { symbol: "NI225", exchange: "TVC", name: "Nikkei 225", category: "indices" },
  { symbol: "FTSE", exchange: "TVC", name: "FTSE 100", category: "indices" },
  { symbol: "DAX", exchange: "XETR", name: "DAX 40", category: "indices" },

  // Stocks
  { symbol: "AAPL", exchange: "NASDAQ", name: "Apple Inc.", category: "stocks" },
  { symbol: "TSLA", exchange: "NASDAQ", name: "Tesla Inc.", category: "stocks" },
  { symbol: "NVDA", exchange: "NASDAQ", name: "NVIDIA Corporation", category: "stocks" },
  { symbol: "MSFT", exchange: "NASDAQ", name: "Microsoft Corporation", category: "stocks" },
  { symbol: "META", exchange: "NASDAQ", name: "Meta Platforms", category: "stocks" },
  { symbol: "AMZN", exchange: "NASDAQ", name: "Amazon.com Inc.", category: "stocks" },
  { symbol: "GOOGL", exchange: "NASDAQ", name: "Alphabet Inc.", category: "stocks" },
];
