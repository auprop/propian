"use client";

import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as analyticsApi from "../api/analytics";

export function useDayOfWeekStats(supabase: SupabaseClient, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["analytics", "day-of-week", dateFrom, dateTo],
    queryFn: () => analyticsApi.getDayOfWeekStats(supabase, dateFrom, dateTo),
  });
}

export function useHourOfDayStats(supabase: SupabaseClient, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["analytics", "hour-of-day", dateFrom, dateTo],
    queryFn: () => analyticsApi.getHourOfDayStats(supabase, dateFrom, dateTo),
  });
}

export function useDirectionStats(supabase: SupabaseClient, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["analytics", "direction", dateFrom, dateTo],
    queryFn: () => analyticsApi.getDirectionStats(supabase, dateFrom, dateTo),
  });
}

export function useEmotionStats(supabase: SupabaseClient, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["analytics", "emotion", dateFrom, dateTo],
    queryFn: () => analyticsApi.getEmotionStats(supabase, dateFrom, dateTo),
  });
}

export function useSetupStats(supabase: SupabaseClient, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["analytics", "setup", dateFrom, dateTo],
    queryFn: () => analyticsApi.getSetupStats(supabase, dateFrom, dateTo),
  });
}

export function useMistakeStats(supabase: SupabaseClient, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["analytics", "mistakes", dateFrom, dateTo],
    queryFn: () => analyticsApi.getMistakeStats(supabase, dateFrom, dateTo),
  });
}

export function useDrawdownCurve(supabase: SupabaseClient, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["analytics", "drawdown-curve", dateFrom, dateTo],
    queryFn: () => analyticsApi.getDrawdownCurve(supabase, dateFrom, dateTo),
  });
}

export function useWeeklyPnl(supabase: SupabaseClient, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["analytics", "weekly-pnl", dateFrom, dateTo],
    queryFn: () => analyticsApi.getWeeklyPnl(supabase, dateFrom, dateTo),
  });
}

export function useRiskRewardDistribution(supabase: SupabaseClient, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["analytics", "rr-distribution", dateFrom, dateTo],
    queryFn: () => analyticsApi.getRiskRewardDistribution(supabase, dateFrom, dateTo),
  });
}
