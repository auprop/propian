-- ============================================================
-- 038 — Unread counts RPC
-- ============================================================
-- Returns per-channel unread message counts for the current user.
-- Used by both web and mobile to show badge counts.

CREATE OR REPLACE FUNCTION public.get_unread_counts()
RETURNS TABLE (
  channel_id uuid,
  unread_count bigint,
  mention_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    cr.id AS channel_id,
    COALESCE(
      (SELECT count(*)
       FROM public.messages m
       WHERE m.room_id = cr.id
         AND m.created_at > COALESCE(
           (SELECT rs.last_read_at
            FROM public.channel_read_state rs
            WHERE rs.user_id = auth.uid() AND rs.channel_id = cr.id),
           '1970-01-01'::timestamptz
         )
         AND m.user_id != auth.uid()
      ), 0
    ) AS unread_count,
    COALESCE(
      (SELECT rs.mention_count
       FROM public.channel_read_state rs
       WHERE rs.user_id = auth.uid() AND rs.channel_id = cr.id),
      0
    ) AS mention_count
  FROM public.chat_rooms cr
  JOIN public.chat_participants cp ON cp.room_id = cr.id AND cp.user_id = auth.uid()
  WHERE cr.community_id IS NOT NULL;
$$;
