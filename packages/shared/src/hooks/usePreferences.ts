"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserPreferences } from "../types";
import * as preferencesApi from "../api/preferences";

export function usePreferences(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["preferences"],
    queryFn: () => preferencesApi.getPreferences(supabase),
    staleTime: 5 * 60_000, // 5 min — settings rarely change
  });
}

export function useUpdatePreferences(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<Omit<UserPreferences, "user_id" | "updated_at">>) =>
      preferencesApi.updatePreferences(supabase, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(["preferences"], data);
    },
  });
}
