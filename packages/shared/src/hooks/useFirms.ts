"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FirmFilter } from "../types";
import * as firmsApi from "../api/firms";
import * as reviewsApi from "../api/reviews";

export function useFirms(supabase: SupabaseClient, filter?: FirmFilter) {
  return useQuery({
    queryKey: ["firms", filter],
    queryFn: () => firmsApi.getFirms(supabase, filter),
    staleTime: 5 * 60_000, // 5 min — firm data rarely changes
  });
}

export function useFirm(supabase: SupabaseClient, slug: string) {
  return useQuery({
    queryKey: ["firm", slug],
    queryFn: () => firmsApi.getFirmBySlug(supabase, slug),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useFirmReviews(supabase: SupabaseClient, firmId: string, sort?: "recent" | "helpful") {
  return useQuery({
    queryKey: ["firm-reviews", firmId, sort],
    queryFn: () => reviewsApi.getReviews(supabase, firmId, sort),
    enabled: !!firmId,
    staleTime: 3 * 60_000, // 3 min
  });
}

export function useCreateReview(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      firmId,
      review,
    }: {
      firmId: string;
      review: { rating: number; title: string; body: string; pros: string[]; cons: string[]; tags: string[]; is_anonymous: boolean };
    }) => reviewsApi.createReview(supabase, firmId, review),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["firm-reviews", variables.firmId] });
      queryClient.invalidateQueries({ queryKey: ["firms"] });
    },
  });
}

export function useVoteReview(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) => reviewsApi.voteReview(supabase, reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["firm-reviews"] });
    },
  });
}
