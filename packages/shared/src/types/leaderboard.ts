import { UserPreview } from "./user";

export type LeaderboardPeriod = "weekly" | "monthly" | "all_time";

export interface LeaderboardEntry {
  user_id: string;
  period: LeaderboardPeriod;
  rank: number;
  roi: number;
  win_rate: number;
  profit_factor: number;
  total_trades: number;
  cached_at: string;
  user?: UserPreview;
}
