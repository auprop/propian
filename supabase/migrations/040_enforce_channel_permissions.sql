-- ============================================================
-- 040 — Enforce channel permissions at RLS level
-- ============================================================
-- Channels with permissions_override->>'can_send_messages' = 'false'
-- should only allow admins and community owners to send messages.
-- Non-members of a community should not be able to send messages
-- even in public communities (they must join first).

-- ─── 1. Update community channel INSERT policy ───
-- Replace the existing policy to add locked-channel + membership checks.

DROP POLICY IF EXISTS "Community members can send messages in community channels" ON public.messages;
CREATE POLICY "Community members can send messages in community channels"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND room_id IN (
      SELECT cr.id FROM public.chat_rooms cr
      WHERE cr.community_id IS NOT NULL
      AND (
        -- Must be a community member (not just public viewer)
        cr.community_id IN (
          SELECT cm.community_id FROM public.community_members cm
          WHERE cm.user_id = auth.uid()
        )
        -- OR user is the community owner
        OR cr.community_id IN (
          SELECT c.id FROM public.communities c
          WHERE c.owner_id = auth.uid()
        )
        -- OR user is a global admin
        OR auth.uid() IN (
          SELECT p.id FROM public.profiles p
          WHERE p.is_admin = true
        )
      )
      AND (
        -- Channel is not locked
        cr.permissions_override IS NULL
        OR (cr.permissions_override->>'can_send_messages')::text != 'false'
        -- OR user is an admin/owner (can bypass locked channels)
        OR cr.community_id IN (
          SELECT c.id FROM public.communities c
          WHERE c.owner_id = auth.uid()
        )
        OR auth.uid() IN (
          SELECT p.id FROM public.profiles p
          WHERE p.is_admin = true
        )
      )
    )
  );
