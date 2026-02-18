"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as refApi from "../api/referrals";

/** Get the current user's referral profile */
export function useReferralProfile(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["referral-profile"],
    queryFn: () => refApi.getReferralProfile(supabase),
    staleTime: 5 * 60_000, // 5 min
  });
}

/** Get the current user's referrals list */
export function useUserReferrals(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["user-referrals"],
    queryFn: () => refApi.getUserReferrals(supabase),
    staleTime: 5 * 60_000,
  });
}

/** Get the referral leaderboard */
export function useReferralLeaderboard(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["referral-leaderboard"],
    queryFn: () => refApi.getReferralLeaderboard(supabase),
    staleTime: 5 * 60_000,
  });
}

/** Apply a referral code */
export function useApplyReferralCode(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => refApi.applyReferralCode(supabase, code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["referral-profile"] });
      qc.invalidateQueries({ queryKey: ["user-referrals"] });
      qc.invalidateQueries({ queryKey: ["referral-leaderboard"] });
    },
  });
}
