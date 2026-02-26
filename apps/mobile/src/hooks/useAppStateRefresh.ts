import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Reconnects Supabase realtime and refetches chat messages
 * when the app comes back to the foreground (e.g. after sleep
 * or switching apps). React Native equivalent of the web
 * `document.visibilitychange` listener.
 */
export function useAppStateRefresh(
  supabase: SupabaseClient,
  roomId: string | undefined
) {
  const queryClient = useQueryClient();
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (!roomId) return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      // App just came back to foreground
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        // Refetch messages to catch up on anything missed
        queryClient.invalidateQueries({ queryKey: ["chat-messages", roomId] });
      }
      appStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [roomId, supabase, queryClient]);
}
