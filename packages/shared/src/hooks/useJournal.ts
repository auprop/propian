"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TradeFilter } from "../types";
import * as tradesApi from "../api/trades";

export function useTrades(supabase: SupabaseClient, filters?: TradeFilter) {
  return useInfiniteQuery({
    queryKey: ["trades", filters],
    queryFn: ({ pageParam }) => tradesApi.getTrades(supabase, pageParam, filters),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useLogTrade(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (trade: Parameters<typeof tradesApi.logTrade>[1]) =>
      tradesApi.logTrade(supabase, trade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["trade-stats"] });
      queryClient.invalidateQueries({ queryKey: ["trade-heatmap"] });
    },
  });
}

export function useUpdateTrade(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tradeId, updates }: { tradeId: string; updates: Parameters<typeof tradesApi.updateTrade>[2] }) =>
      tradesApi.updateTrade(supabase, tradeId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["trade-stats"] });
      queryClient.invalidateQueries({ queryKey: ["trade-heatmap"] });
    },
  });
}

export function useDeleteTrade(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tradeId: string) => tradesApi.deleteTrade(supabase, tradeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["trade-stats"] });
      queryClient.invalidateQueries({ queryKey: ["trade-heatmap"] });
    },
  });
}

export function useTradeStats(supabase: SupabaseClient, filters?: TradeFilter) {
  return useQuery({
    queryKey: ["trade-stats", filters],
    queryFn: () => tradesApi.getTradeStats(supabase, filters),
  });
}

export function useTradeHeatmap(supabase: SupabaseClient, year: number, month: number) {
  return useQuery({
    queryKey: ["trade-heatmap", year, month],
    queryFn: () => tradesApi.getTradeHeatmap(supabase, year, month),
  });
}

export function useDayTrades(supabase: SupabaseClient, date: string | null) {
  return useQuery({
    queryKey: ["day-trades", date],
    queryFn: () => tradesApi.getDayTrades(supabase, date!),
    enabled: date != null,
  });
}
