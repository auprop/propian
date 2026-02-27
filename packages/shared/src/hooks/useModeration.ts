"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as moderationApi from "../api/moderation";

/* ------------------------------------------------------------------ */
/*  Mute status for a single user                                      */
/* ------------------------------------------------------------------ */

export function useMuteStatus(supabase: SupabaseClient, targetUserId: string) {
  return useQuery({
    queryKey: ["mute-status", targetUserId],
    queryFn: () => moderationApi.getMuteStatus(supabase, targetUserId),
    enabled: !!targetUserId,
  });
}

/* ------------------------------------------------------------------ */
/*  Mute / Unmute mutations                                            */
/* ------------------------------------------------------------------ */

export function useMute(supabase: SupabaseClient) {
  const queryClient = useQueryClient();

  const muteMutation = useMutation({
    mutationFn: (targetUserId: string) => moderationApi.muteUser(supabase, targetUserId),
    onSuccess: (_data, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ["mute-status", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["muted-ids"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const unmuteMutation = useMutation({
    mutationFn: (targetUserId: string) => moderationApi.unmuteUser(supabase, targetUserId),
    onSuccess: (_data, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ["mute-status", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["muted-ids"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  return { mute: muteMutation, unmute: unmuteMutation };
}

/* ------------------------------------------------------------------ */
/*  Block status for a single user                                     */
/* ------------------------------------------------------------------ */

export function useBlockStatus(supabase: SupabaseClient, targetUserId: string) {
  return useQuery({
    queryKey: ["block-status", targetUserId],
    queryFn: () => moderationApi.getBlockStatus(supabase, targetUserId),
    enabled: !!targetUserId,
  });
}

/* ------------------------------------------------------------------ */
/*  Block / Unblock mutations                                          */
/* ------------------------------------------------------------------ */

export function useBlock(supabase: SupabaseClient) {
  const queryClient = useQueryClient();

  const blockMutation = useMutation({
    mutationFn: (targetUserId: string) => moderationApi.blockUser(supabase, targetUserId),
    onSuccess: (_data, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ["block-status", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["blocked-ids"] });
      queryClient.invalidateQueries({ queryKey: ["follow-status", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const unblockMutation = useMutation({
    mutationFn: (targetUserId: string) => moderationApi.unblockUser(supabase, targetUserId),
    onSuccess: (_data, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ["block-status", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["blocked-ids"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  return { block: blockMutation, unblock: unblockMutation };
}

/* ------------------------------------------------------------------ */
/*  Bulk fetch: all muted/blocked IDs (for feed filtering)             */
/* ------------------------------------------------------------------ */

export function useMutedIds(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["muted-ids"],
    queryFn: () => moderationApi.getMutedUserIds(supabase),
    staleTime: 2 * 60_000,
  });
}

export function useBlockedIds(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["blocked-ids"],
    queryFn: async () => {
      const [blocked, blockedBy] = await Promise.all([
        moderationApi.getBlockedUserIds(supabase),
        moderationApi.getBlockedByUserIds(supabase),
      ]);
      return { blocked, blockedBy, all: [...new Set([...blocked, ...blockedBy])] };
    },
    staleTime: 2 * 60_000,
  });
}
