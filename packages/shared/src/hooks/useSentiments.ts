"use client";

import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssetClass } from "../types";
import * as sentimentsApi from "../api/sentiments";

/** Fetch all live sentiments, optionally filtered by asset class */
export function useSentiments(
  supabase: SupabaseClient,
  assetClass?: AssetClass,
) {
  return useQuery({
    queryKey: ["sentiments", assetClass ?? "all"],
    queryFn: () => sentimentsApi.getSentiments(supabase, assetClass),
    refetchInterval: 30_000,
  });
}

/** Fetch sentiment history for a single instrument */
export function useSentimentHistory(
  supabase: SupabaseClient,
  symbol: string,
  limit?: number,
) {
  return useQuery({
    queryKey: ["sentiment-history", symbol, limit],
    queryFn: () => sentimentsApi.getSentimentHistory(supabase, symbol, limit),
    enabled: !!symbol,
  });
}

/** Fetch aggregated hero stats */
export function useSentimentHero(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["sentiment-hero"],
    queryFn: () => sentimentsApi.getSentimentHero(supabase),
    refetchInterval: 30_000,
  });
}
