"use client";

import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as portfolioApi from "../api/portfolio";

export function useOpenPositions(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["portfolio", "open-positions"],
    queryFn: () => portfolioApi.getOpenPositions(supabase),
  });
}

export function useEquityCurve(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["portfolio", "equity-curve"],
    queryFn: () => portfolioApi.getEquityCurve(supabase),
  });
}

export function usePairBreakdown(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["portfolio", "pair-breakdown"],
    queryFn: () => portfolioApi.getPairBreakdown(supabase),
  });
}

export function useMonthlyReturns(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["portfolio", "monthly-returns"],
    queryFn: () => portfolioApi.getMonthlyReturns(supabase),
  });
}

export function usePortfolioSummary(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["portfolio", "summary"],
    queryFn: () => portfolioApi.getPortfolioSummary(supabase),
  });
}
