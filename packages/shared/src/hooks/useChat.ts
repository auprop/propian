"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message, StructuredTradeData } from "../types";
import * as chatApi from "../api/chat";

/* ─── Rooms (DMs + non-community groups) ─── */

export function useChatRooms(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["chat-rooms"],
    queryFn: () => chatApi.getRooms(supabase),
    staleTime: 2 * 60_000,
  });
}

/* ─── Messages with Realtime ─── */

export function useChatMessages(supabase: SupabaseClient, roomId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["chat-messages", roomId],
    queryFn: () => chatApi.getMessages(supabase, roomId),
    enabled: !!roomId,
  });

  // Real-time: new messages + reaction changes
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        () => {
          // Refetch messages to get updated reactions
          queryClient.invalidateQueries({ queryKey: ["chat-messages", roomId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, roomId, queryClient]);

  return query;
}

/* ─── Send Message ─── */

export function useSendMessage(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      roomId,
      content,
      type,
      ticker_mentions,
      structured_data,
    }: {
      roomId: string;
      content: string;
      type?: "text" | "image";
      ticker_mentions?: string[];
      structured_data?: StructuredTradeData;
    }) =>
      chatApi.sendMessage(supabase, roomId, content, type, {
        ticker_mentions,
        structured_data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
    },
  });
}

/* ─── DMs & Groups ─── */

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

/* ─── Channel Read State ─── */

export function useUnreadCounts(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["unread-counts"],
    queryFn: () => chatApi.getUnreadCounts(supabase),
    staleTime: 30_000, // 30 sec
  });
}

export function useUpdateReadState(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, lastReadMessageId }: { channelId: string; lastReadMessageId: string }) =>
      chatApi.updateReadState(supabase, channelId, lastReadMessageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
    },
  });
}
