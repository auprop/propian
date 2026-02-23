"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
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

/* ─── Messages with Realtime (Broadcast-based) ─── */

/**
 * Subscribes to a room channel using Supabase **Broadcast** instead of
 * `postgres_changes`. Broadcast is instant because it bypasses the
 * single-threaded RLS authorization check that causes 15-30s delays.
 *
 * Flow:
 * 1. Sender inserts message → API returns full message with author
 * 2. Sender broadcasts the message on `room:{roomId}` channel
 * 3. All other clients receive the broadcast instantly
 * 4. Sender's own message already in cache via onSuccess (duplicate skipped)
 */
export function useChatMessages(supabase: SupabaseClient, roomId: string) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(supabase);
  supabaseRef.current = supabase;
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  const [reconnectKey, setReconnectKey] = useState(0);

  useEffect(() => {
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (!roomId) return;

    const sb = supabaseRef.current;
    const qc = queryClientRef.current;

    const channel = sb
      .channel(`room:${roomId}`)
      .on("broadcast", { event: "new-message" }, (payload) => {
        const newMsg = payload.payload as Message;
        console.log("[RT] Broadcast received:", newMsg?.id, "parent:", newMsg?.parent_message_id, "content:", newMsg?.content?.slice(0, 30));
        if (!newMsg?.id) return;

        // Thread reply — update parent reply_count, don't add to main list
        if (newMsg.parent_message_id) {
          const threadCache = qc.getQueryData<Message[]>(["thread-replies", newMsg.parent_message_id]);
          const alreadyInThread = threadCache?.some((m) => m.id === newMsg.id);

          if (!alreadyInThread) {
            // Update parent's reply_count in main message list
            qc.setQueryData<Message[]>(["chat-messages", roomId], (old) => {
              if (!old) return old;
              return old.map((m) =>
                m.id === newMsg.parent_message_id
                  ? {
                      ...m,
                      reply_count: (m.reply_count ?? 0) + 1,
                      last_reply_at: newMsg.created_at,
                    }
                  : m
              );
            });

            // Append to thread cache if loaded
            if (threadCache) {
              qc.setQueryData<Message[]>(["thread-replies", newMsg.parent_message_id], (old) => {
                if (!old) return [newMsg];
                if (old.some((m) => m.id === newMsg.id)) return old;
                return [...old, newMsg];
              });
            } else {
              qc.invalidateQueries({ queryKey: ["thread-replies", newMsg.parent_message_id] });
            }
          }
          return;
        }

        // Top-level message — append to cache
        const existing = qc.getQueryData<Message[]>(["chat-messages", roomId]);
        if (existing?.some((m) => m.id === newMsg.id)) return;

        qc.setQueryData<Message[]>(["chat-messages", roomId], (old) => {
          if (!old) return [newMsg];
          if (old.some((m) => m.id === newMsg.id)) return old;
          return [...old, newMsg];
        });
      })
      .subscribe((status) => {
        console.log("[RT] Room channel:", status, "room:", roomId);

        if (status === "CHANNEL_ERROR") {
          qc.invalidateQueries({ queryKey: ["chat-messages", roomId] });
        }
        if (status === "TIMED_OUT") {
          qc.invalidateQueries({ queryKey: ["chat-messages", roomId] });
          setTimeout(() => setReconnectKey((k) => k + 1), 2000);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        sb.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, reconnectKey]);

  const query = useQuery({
    queryKey: ["chat-messages", roomId],
    queryFn: () => chatApi.getMessages(supabase, roomId),
    enabled: !!roomId,
    refetchOnWindowFocus: true,
    refetchInterval: 10_000, // Poll every 10s as safety net
  });

  // Refetch when tab becomes visible
  useEffect(() => {
    if (!roomId || typeof document === "undefined") return;
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        queryClientRef.current.invalidateQueries({ queryKey: ["chat-messages", roomId] });
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [roomId]);

  // Refetch when browser comes back online
  useEffect(() => {
    if (!roomId || typeof window === "undefined" || typeof window.addEventListener !== "function") return;
    function handleOnline() {
      queryClientRef.current.invalidateQueries({ queryKey: ["chat-messages", roomId] });
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [roomId]);

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
      parent_message_id,
    }: {
      roomId: string;
      content: string;
      type?: "text" | "image";
      ticker_mentions?: string[];
      structured_data?: StructuredTradeData;
      parent_message_id?: string;
    }) =>
      chatApi.sendMessage(supabase, roomId, content, type, {
        ticker_mentions,
        structured_data,
        parent_message_id,
      }),
    onSuccess: (newMessage, { roomId, parent_message_id }) => {
      if (parent_message_id) {
        queryClient.setQueryData<Message[]>(["thread-replies", parent_message_id], (old) => {
          if (!old) return [newMessage];
          if (old.some((m) => m.id === newMessage.id)) return old;
          return [...old, newMessage];
        });
        queryClient.setQueryData<Message[]>(["chat-messages", roomId], (old) => {
          if (!old) return old;
          return old.map((m) =>
            m.id === parent_message_id
              ? {
                  ...m,
                  reply_count: (m.reply_count ?? 0) + 1,
                  last_reply_at: newMessage.created_at,
                }
              : m
          );
        });
      } else {
        queryClient.setQueryData<Message[]>(["chat-messages", roomId], (old) => {
          if (!old) return [newMessage];
          if (old.some((m) => m.id === newMessage.id)) return old;
          return [...old, newMessage];
        });
      }
      queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
    },
  });
}

/* ─── Thread Replies (with Broadcast Realtime) ─── */

/**
 * Thread replies are delivered via the same room broadcast channel.
 * No separate thread channel needed — the room channel handler routes
 * messages with `parent_message_id` to the thread cache.
 * This hook just provides the query + initial fetch.
 */
export function useThreadReplies(supabase: SupabaseClient, parentMessageId: string) {
  return useQuery({
    queryKey: ["thread-replies", parentMessageId],
    queryFn: () => chatApi.getThreadReplies(supabase, parentMessageId),
    enabled: !!parentMessageId,
    refetchOnWindowFocus: true,
    refetchInterval: 10_000, // Poll every 10s as safety net (broadcast handles instant delivery)
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
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

export function useUnreadCountsMap(supabase: SupabaseClient) {
  const { data, ...rest } = useUnreadCounts(supabase);
  const map = useMemo(() => {
    const m: Record<string, { count: number; mentions: number }> = {};
    data?.forEach((row) => {
      m[row.channel_id] = { count: row.unread_count, mentions: row.mention_count };
    });
    return m;
  }, [data]);
  return { data: map, ...rest };
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
