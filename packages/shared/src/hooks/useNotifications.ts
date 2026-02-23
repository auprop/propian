"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as notifApi from "../api/notifications";

export function useNotifications(supabase: SupabaseClient) {
  const queryClient = useQueryClient();

  // Refs so the realtime subscription never re-creates
  const supabaseRef = useRef(supabase);
  supabaseRef.current = supabase;
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notifApi.getNotifications(supabase),
  });

  const countQuery = useQuery({
    queryKey: ["notifications-count"],
    queryFn: () => notifApi.getUnreadCount(supabase),
  });

  // Real-time subscription — subscribe once, never re-subscribe
  useEffect(() => {
    const sb = supabaseRef.current;
    const qc = queryClientRef.current;

    const channel = sb
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
          qc.invalidateQueries({ queryKey: ["notifications-count"] });
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...query, unreadCount: countQuery.data ?? 0 };
}

export function useMarkRead(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notifApi.markRead(supabase, notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });
}

export function useMarkAllRead(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notifApi.markAllRead(supabase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });
}
