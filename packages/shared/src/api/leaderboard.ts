import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeaderboardEntry, LeaderboardPeriod } from "../types";

export async function getRankings(
  supabase: SupabaseClient,
  period: LeaderboardPeriod = "weekly",
  limit = 50
) {
  const { data, error } = await supabase
    .from("leaderboard_cache")
    .select("*, user:profiles!user_id(id, username, display_name, avatar_url, is_verified, pro_subscription_status)")
    .eq("period", period)
    .order("rank", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data as LeaderboardEntry[];
}
