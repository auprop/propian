-- ============================================================
-- 028 — Fix RLS policies for community channels
-- ============================================================
-- Community channels (chat_rooms with community_id) need to be
-- visible to community members, not just chat_participants.
-- Similarly, messages in community channels need the same access.
-- Admins (is_admin = true) and community owners always have access.

-- ─── chat_rooms: allow community members / owners / admins to see community channels ───

CREATE POLICY "Community members can view community channels"
  ON public.chat_rooms FOR SELECT
  USING (
    community_id IS NOT NULL
    AND (
      community_id IN (
        SELECT community_id FROM public.community_members WHERE user_id = auth.uid()
      )
      OR community_id IN (
        SELECT id FROM public.communities WHERE owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
      )
    )
  );

-- ─── messages: allow community members / owners / admins to read messages ───

CREATE POLICY "Community members can view messages in community channels"
  ON public.messages FOR SELECT
  USING (
    room_id IN (
      SELECT cr.id FROM public.chat_rooms cr
      WHERE cr.community_id IS NOT NULL
      AND (
        cr.community_id IN (
          SELECT community_id FROM public.community_members WHERE user_id = auth.uid()
        )
        OR cr.community_id IN (
          SELECT id FROM public.communities WHERE owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
        )
      )
    )
  );

-- ─── messages: allow community members / owners / admins to send messages ───

CREATE POLICY "Community members can send messages in community channels"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND room_id IN (
      SELECT cr.id FROM public.chat_rooms cr
      WHERE cr.community_id IS NOT NULL
      AND (
        cr.community_id IN (
          SELECT community_id FROM public.community_members WHERE user_id = auth.uid()
        )
        OR cr.community_id IN (
          SELECT id FROM public.communities WHERE owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
        )
      )
    )
  );

-- ─── chat_rooms: allow community owner + admins to create channels ───

CREATE POLICY "Community owner can create channels"
  ON public.chat_rooms FOR INSERT
  WITH CHECK (
    community_id IS NOT NULL
    AND auth.uid() = created_by
    AND (
      community_id IN (
        SELECT id FROM public.communities WHERE owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
      )
    )
  );
