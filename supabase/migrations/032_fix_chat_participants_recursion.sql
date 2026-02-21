-- ============================================================
-- 032 — Fix chat_participants RLS infinite recursion
-- ============================================================
-- The chat_participants SELECT policy references chat_participants itself,
-- causing infinite recursion. Fix with a SECURITY DEFINER helper.

-- Helper: get room IDs the current user participates in
CREATE OR REPLACE FUNCTION public.get_user_room_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT room_id FROM public.chat_participants WHERE user_id = auth.uid();
$$;

-- ─── Fix chat_participants policies ───

DROP POLICY IF EXISTS "Participants can view participants in their rooms" ON public.chat_participants;
CREATE POLICY "Participants can view participants in their rooms"
  ON public.chat_participants FOR SELECT
  USING (room_id IN (SELECT public.get_user_room_ids()));

DROP POLICY IF EXISTS "Room creator can add participants" ON public.chat_participants;
CREATE POLICY "Room creator can add participants"
  ON public.chat_participants FOR INSERT
  WITH CHECK (
    room_id IN (SELECT id FROM public.chat_rooms WHERE created_by = auth.uid())
    OR user_id = auth.uid()
  );

-- ─── Fix chat_rooms policies ───

DROP POLICY IF EXISTS "Users can view rooms they're in" ON public.chat_rooms;
CREATE POLICY "Users can view rooms they're in"
  ON public.chat_rooms FOR SELECT
  USING (id IN (SELECT public.get_user_room_ids()));

-- ─── Fix messages policies ───

DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.messages;
CREATE POLICY "Users can view messages in their rooms"
  ON public.messages FOR SELECT
  USING (room_id IN (SELECT public.get_user_room_ids()));

DROP POLICY IF EXISTS "Users can send messages to their rooms" ON public.messages;
CREATE POLICY "Users can send messages to their rooms"
  ON public.messages FOR INSERT
  WITH CHECK (
    room_id IN (SELECT public.get_user_room_ids())
    AND auth.uid() = user_id
  );

-- ─── Fix message_reactions policies that reference chat_participants ───

DROP POLICY IF EXISTS "Users can view reactions in their rooms" ON public.message_reactions;
CREATE POLICY "Users can view reactions in their rooms"
  ON public.message_reactions FOR SELECT
  USING (
    -- DM/group via chat_participants
    message_id IN (
      SELECT m.id FROM public.messages m
      WHERE m.room_id IN (SELECT public.get_user_room_ids())
    )
    -- Community channels
    OR message_id IN (
      SELECT m.id FROM public.messages m
      JOIN public.chat_rooms cr ON cr.id = m.room_id
      WHERE cr.community_id IS NOT NULL
      AND public.has_community_access(cr.community_id)
    )
  );

DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
CREATE POLICY "Users can add reactions"
  ON public.message_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      message_id IN (
        SELECT m.id FROM public.messages m
        WHERE m.room_id IN (SELECT public.get_user_room_ids())
      )
      OR message_id IN (
        SELECT m.id FROM public.messages m
        JOIN public.chat_rooms cr ON cr.id = m.room_id
        WHERE cr.community_id IS NOT NULL
        AND public.has_community_access(cr.community_id)
      )
    )
  );
