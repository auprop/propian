"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message } from "../types";
import * as chatApi from "../api/chat";

export function useChatRooms(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["chat-rooms"],
    queryFn: () => chatApi.getRooms(supabase),
    staleTime: 2 * 60_000, // 2 min — room list doesn't change often
  });
}

export function useChatMessages(supabase: SupabaseClient, roomId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["chat-messages", roomId],
    queryFn: () => chatApi.getMessages(supabase, roomId),
    enabled: !!roomId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          queryClient.setQueryData<Message[]>(["chat-messages", roomId], (old) =>
            old ? [...old, payload.new as Message] : [payload.new as Message]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, roomId, queryClient]);

  return query;
}

export function useSendMessage(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, content, type }: { roomId: string; content: string; type?: "text" | "image" }) =>
      chatApi.sendMessage(supabase, roomId, content, type),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
    },
  });
}

export function useCreateDM(supabase: SupabaseClient) {
  return useMutation({
    mutationFn: (targetUserId: string) => chatApi.createDM(supabase, targetUserId),
  });
}

export function useCreateGroup(supabase: SupabaseClient) {
  return useMutation({
    mutationFn: ({ name, memberIds }: { name: string; memberIds: string[] }) =>
      chatApi.createGroup(supabase, name, memberIds),
  });
}
