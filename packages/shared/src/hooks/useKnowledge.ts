"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as knowledgeApi from "../api/knowledge";

export function useKnowledgePins(supabase: SupabaseClient, communityId: string, category?: string) {
  return useQuery({
    queryKey: ["knowledge-pins", communityId, category],
    queryFn: () => knowledgeApi.getKnowledgePins(supabase, communityId, category),
    enabled: !!communityId,
    staleTime: 2 * 60_000,
  });
}

export function usePinMessage(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      communityId,
      channelId,
      messageId,
      category,
      tags,
    }: {
      communityId: string;
      channelId: string;
      messageId: string;
      category?: string;
      tags?: string[];
    }) => knowledgeApi.pinMessage(supabase, communityId, channelId, messageId, category, tags),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-pins", variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
    },
  });
}

export function useUnpinMessage(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pinId: string) => knowledgeApi.unpinMessage(supabase, pinId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-pins"] });
      queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
    },
  });
}

export function useUpdatePin(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pinId, updates }: { pinId: string; updates: { category?: string; tags?: string[] } }) =>
      knowledgeApi.updatePin(supabase, pinId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-pins"] });
    },
  });
}
