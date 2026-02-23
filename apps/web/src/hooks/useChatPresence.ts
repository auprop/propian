"use client";

import { useEffect, useRef, useCallback } from "react";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import { useChatStore } from "@/stores/chat";

interface PresenceState {
  user_id: string;
  display_name: string;
  typing_in?: string | null;
}

/**
 * Manages Supabase Realtime Presence for the chat.
 * - Tracks which users are online
 * - Broadcasts & receives typing indicators
 *
 * IMPORTANT: The presence channel is GLOBAL — it subscribes once when the
 * user logs in and stays open for the entire session. It must NOT depend
 * on activeChannelId or any other frequently-changing value, because
 * tearing down channels disrupts the shared WebSocket connection.
 */
export function useChatPresence(
  supabase: SupabaseClient,
  userId: string | undefined,
  displayName: string | undefined
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { setOnlineUsers, setTypingUsers } = useChatStore();

  // Track activeChannelId via a ref + Zustand subscribe so we can read the
  // latest value inside the presence sync handler WITHOUT including it in the
  // useEffect deps (which would tear down the channel on every switch).
  const activeChannelIdRef = useRef(useChatStore.getState().activeChannelId);
  useEffect(() => {
    const unsub = useChatStore.subscribe((state) => {
      activeChannelIdRef.current = state.activeChannelId;
    });
    return unsub;
  }, []);

  // Store supabase in a ref so the subscription uses the latest instance
  // without re-running the effect.
  const supabaseRef = useRef(supabase);
  supabaseRef.current = supabase;

  // Subscribe to the global presence channel — once per session
  useEffect(() => {
    if (!userId || !displayName) return;

    const sb = supabaseRef.current;

    const channel = sb.channel("chat-presence", {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const onlineIds: string[] = [];
        const typingMap: Record<string, string[]> = {};

        for (const [, presences] of Object.entries(state)) {
          for (const p of presences) {
            onlineIds.push(p.user_id);
            if (p.typing_in) {
              if (!typingMap[p.typing_in]) typingMap[p.typing_in] = [];
              // Don't show ourselves as typing
              if (p.user_id !== userId) {
                typingMap[p.typing_in].push(p.display_name);
              }
            }
          }
        }

        setOnlineUsers(onlineIds);

        // Update typing for the active channel (read from ref, not from closure)
        const currentChannel = activeChannelIdRef.current;
        if (currentChannel) {
          setTypingUsers(currentChannel, typingMap[currentChannel] ?? []);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          try {
            await channel.track({
              user_id: userId,
              display_name: displayName,
              typing_in: null,
            } satisfies PresenceState);
          } catch {
            // Presence track can fail silently (e.g. channel closed)
          }
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack().catch(() => {});
      sb.removeChannel(channel);
      channelRef.current = null;
    };
    // Only re-subscribe when userId or displayName changes (login/logout).
    // supabase accessed via ref. activeChannelId accessed via ref.
    // setOnlineUsers/setTypingUsers are stable Zustand actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, displayName, setOnlineUsers, setTypingUsers]);

  // Broadcast typing state
  const broadcastTyping = useCallback(
    (channelId: string) => {
      if (!channelRef.current || !userId || !displayName) return;

      // Update presence to show typing
      channelRef.current.track({
        user_id: userId,
        display_name: displayName,
        typing_in: channelId,
      } satisfies PresenceState).catch(() => {});

      // Clear typing after 3 seconds of inactivity
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        channelRef.current?.track({
          user_id: userId,
          display_name: displayName,
          typing_in: null,
        } satisfies PresenceState).catch(() => {});
      }, 3000);
    },
    [userId, displayName]
  );

  // Stop typing indicator immediately (called on send)
  const stopTyping = useCallback(() => {
    if (!channelRef.current || !userId || !displayName) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    channelRef.current.track({
      user_id: userId,
      display_name: displayName,
      typing_in: null,
    } satisfies PresenceState).catch(() => {});
  }, [userId, displayName]);

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return { broadcastTyping, stopTyping };
}
