"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message, MessageReaction } from "../types";
import * as reactionsApi from "../api/reactions";

export function useAddReaction(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji, userId }: { messageId: string; emoji: string; userId?: string }) =>
      reactionsApi.addReaction(supabase, messageId, emoji),
    onMutate: async ({ messageId, emoji, userId }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["chat-messages"] });

      const keys = queryClient.getQueryCache().findAll({ queryKey: ["chat-messages"] });
      for (const query of keys) {
        queryClient.setQueryData<Message[]>(query.queryKey, (old) => {
          if (!old) return old;
          return old.map((msg) => {
            if (msg.id !== messageId) return msg;
            const newReaction: MessageReaction = {
              id: "optimistic-" + Date.now(),
              message_id: messageId,
              user_id: userId ?? "unknown",
              emoji,
              created_at: new Date().toISOString(),
            };
            return {
              ...msg,
              reactions: [...(msg.reactions || []), newReaction],
            };
          });
        });
      }
    },
    onSettled: () => {
      // Refetch to get the real data (including joined user profiles)
      queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
    },
  });
}

export function useRemoveReaction(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji, userId }: { messageId: string; emoji: string; userId?: string }) =>
      reactionsApi.removeReaction(supabase, messageId, emoji),
    onMutate: async ({ messageId, emoji, userId }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["chat-messages"] });

      const keys = queryClient.getQueryCache().findAll({ queryKey: ["chat-messages"] });
      for (const query of keys) {
        queryClient.setQueryData<Message[]>(query.queryKey, (old) => {
          if (!old) return old;
          return old.map((msg) => {
            if (msg.id !== messageId) return msg;
            return {
              ...msg,
              reactions: (msg.reactions || []).filter(
                (r) => !(r.emoji === emoji && r.user_id === userId)
              ),
            };
          });
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
    },
  });
}
