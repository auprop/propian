-- ============================================================
-- 039 — Fix get_unread_counts to use community_members
-- ============================================================
-- Community channels use community_members for access, NOT
-- chat_participants. The RPC was joining chat_participants
-- which meant community channel members got zero results.

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
  WHERE cr.community_id IS NOT NULL
    AND (
      -- User is a community member
      cr.community_id IN (
        SELECT cm.community_id FROM public.community_members cm WHERE cm.user_id = auth.uid()
      )
      -- OR user is the community owner
      OR cr.community_id IN (
        SELECT c.id FROM public.communities c WHERE c.owner_id = auth.uid()
      )
      -- OR user is an admin
      OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true
      )
    );
$$;
