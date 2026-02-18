"use client";

import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeaderboardPeriod } from "../types";
import * as leaderboardApi from "../api/leaderboard";

export function useLeaderboard(supabase: SupabaseClient, period: LeaderboardPeriod = "weekly") {
  return useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => leaderboardApi.getRankings(supabase, period),
    staleTime: 2 * 60_000, // 2 min — rankings update periodically
  });
}
