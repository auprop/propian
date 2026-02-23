-- ============================================================
-- 036 — Fix DM/group realtime delivery
-- ============================================================
-- The messages SELECT policy for DMs/groups uses get_user_room_ids()
-- which is a SECURITY DEFINER function. Like the community channel fix
-- in 035, SECURITY DEFINER functions can be unreliable in Supabase
-- Realtime's RLS evaluation context. Replace with a direct subquery.
--
-- Note: We KEEP get_user_room_ids() for chat_participants policies
-- where it's needed to avoid infinite recursion. The messages table
-- doesn't have that recursion issue.

-- ─── 1. Fix messages SELECT policy for DM/group rooms ───

DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.messages;
CREATE POLICY "Users can view messages in their rooms"
  ON public.messages FOR SELECT
  USING (
    room_id IN (
      SELECT cp.room_id FROM public.chat_participants cp
      WHERE cp.user_id = auth.uid()
    )
  );

-- ─── 2. Fix messages INSERT policy for DM/group rooms ───

DROP POLICY IF EXISTS "Users can send messages to their rooms" ON public.messages;
CREATE POLICY "Users can send messages to their rooms"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND room_id IN (
      SELECT cp.room_id FROM public.chat_participants cp
      WHERE cp.user_id = auth.uid()
    )
  );

-- ─── 3. Fix chat_rooms SELECT policy ───
-- Same issue: chat_rooms policy uses get_user_room_ids() which may
-- fail in realtime context. Replace with direct subquery.

DROP POLICY IF EXISTS "Users can view rooms they're in" ON public.chat_rooms;
CREATE POLICY "Users can view rooms they're in"
  ON public.chat_rooms FOR SELECT
  USING (
    id IN (
      SELECT cp.room_id FROM public.chat_participants cp
      WHERE cp.user_id = auth.uid()
    )
    -- Also allow viewing community channel rooms
    OR community_id IS NOT NULL
  );

-- ─── 4. Set REPLICA IDENTITY FULL on chat_rooms and chat_participants ───
-- Ensures realtime can deliver full row data for these tables too.

ALTER TABLE public.chat_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.chat_participants REPLICA IDENTITY FULL;
