export type TradeDirection = "long" | "short";
export type TradeStatus = "open" | "closed" | "breakeven";
export type TradeEmotion = "confident" | "neutral" | "fearful" | "greedy" | "revenge";

export interface Trade {
  id: string;
  user_id: string;
  pair: string;
  direction: TradeDirection;
  entry_price: number;
  exit_price: number | null;
  lot_size: number;
  stop_loss: number | null;
  take_profit: number | null;
  pnl: number | null;
  pnl_pips: number | null;
  rr_ratio: number | null;
  commission: number;
  swap: number;
  screenshot_url: string | null;
  notes: string | null;
  tags: string[];
  setup: string | null;
  mistakes: string[];
  emotion: TradeEmotion | null;
  confidence: number | null;
  status: TradeStatus;
  trade_date: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeStats {
  total_trades: number;
  win_count: number;
  loss_count: number;
  breakeven_count: number;
  win_rate: number;
  total_pnl: number;
  avg_pnl: number;
  avg_rr: number;
  best_trade: number;
  worst_trade: number;
  profit_factor: number;
  avg_win: number;
  avg_loss: number;
}

export interface TradeHeatmapDay {
  date: string;
  trade_count: number;
  pnl: number;
}

export interface TradeFilter {
  status?: TradeStatus;
  pair?: string;
  direction?: TradeDirection;
  dateFrom?: string;
  dateTo?: string;
}

/* ─── Portfolio types ─── */

export interface EquityCurvePoint {
  date: string;
  cumulative_pnl: number;
  trade_count: number;
}

export interface PairBreakdown {
  pair: string;
  trade_count: number;
  win_count: number;
  loss_count: number;
  win_rate: number;
  total_pnl: number;
  avg_pnl: number;
}

export interface MonthlyReturn {
  month: string; // "2025-01"
  pnl: number;
  trade_count: number;
  win_rate: number;
}

/* ─── Analytics types ─── */

export interface DayOfWeekStats {
  day: number; // 0 = Sun, 6 = Sat
  day_name: string;
  trade_count: number;
  win_count: number;
  win_rate: number;
  total_pnl: number;
  avg_pnl: number;
}

export interface HourOfDayStats {
  hour: number; // 0-23
  trade_count: number;
  win_count: number;
  win_rate: number;
  total_pnl: number;
}

export interface DirectionStats {
  direction: TradeDirection;
  trade_count: number;
  win_count: number;
  win_rate: number;
  total_pnl: number;
  avg_pnl: number;
  avg_rr: number;
  best_trade: number;
  worst_trade: number;
}

export interface EmotionStats {
  emotion: TradeEmotion;
  trade_count: number;
  win_count: number;
  win_rate: number;
  total_pnl: number;
  avg_pnl: number;
}

export interface SetupStats {
  setup: string;
  trade_count: number;
  win_count: number;
  win_rate: number;
  total_pnl: number;
}

export interface MistakeStats {
  mistake: string;
  count: number;
  total_pnl: number;
}

export interface DrawdownPoint {
  date: string;
  drawdown: number;
  drawdown_pct: number;
}

export interface WeeklyPnl {
  week_start: string;
  pnl: number;
  trade_count: number;
  win_rate: number;
}

export interface RiskRewardBucket {
  bucket: string; // e.g. "<1", "1-2", "2-3", "3+"
  count: number;
  win_count: number;
  win_rate: number;
}

export interface PortfolioSummary {
  /* balances */
  total_pnl: number;
  open_pnl: number;
  closed_pnl: number;

  /* positions */
  open_positions: number;
  closed_positions: number;

  /* risk */
  max_drawdown: number;
  max_drawdown_pct: number;
  current_drawdown: number;

  /* streaks */
  current_streak: number; // positive = wins, negative = losses
  longest_win_streak: number;
  longest_loss_streak: number;

  /* time */
  first_trade_date: string | null;
  last_trade_date: string | null;
  active_days: number;
}
