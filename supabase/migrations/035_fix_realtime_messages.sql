-- ============================================================
-- 035 — Fix realtime delivery for messages
-- ============================================================
-- Two issues preventing reliable realtime:
-- 1. Missing REPLICA IDENTITY FULL on messages table
-- 2. Complex RLS policies that Supabase Realtime can't evaluate efficiently
--
-- Solution: Set REPLICA IDENTITY FULL so realtime can include full row data,
-- and add a simplified SELECT policy for community channel messages that
-- avoids calling SECURITY DEFINER functions (which can fail in realtime context).

-- ─── 1. Enable REPLICA IDENTITY FULL on messages ───
-- This allows Supabase Realtime to include the full OLD and NEW row
-- in change events, which is required for reliable delivery.
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Also set it on message_reactions for good measure
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;

-- ─── 2. Simplify the community messages SELECT policy ───
-- The current policy uses has_community_access() which calls multiple
-- SECURITY DEFINER functions. This can be unreliable in the Realtime
-- RLS evaluation context. Replace with a direct, simple check.

DROP POLICY IF EXISTS "Community members can view messages in community channels" ON public.messages;
CREATE POLICY "Community members can view messages in community channels"
  ON public.messages FOR SELECT
  USING (
    room_id IN (
      SELECT cr.id FROM public.chat_rooms cr
      WHERE cr.community_id IS NOT NULL
      AND (
        -- User is a member of the community
        cr.community_id IN (
          SELECT cm.community_id FROM public.community_members cm
          WHERE cm.user_id = auth.uid()
        )
        -- OR the community is public
        OR cr.community_id IN (
          SELECT c.id FROM public.communities c
          WHERE (c.settings->>'is_public')::boolean = true
        )
        -- OR user is admin
        OR auth.uid() IN (
          SELECT p.id FROM public.profiles p
          WHERE p.is_admin = true
        )
      )
    )
  );

-- ─── 3. Also fix community INSERT policy to match ───
-- Ensure the INSERT policy for community messages also uses direct checks

DROP POLICY IF EXISTS "Community members can send messages in community channels" ON public.messages;
CREATE POLICY "Community members can send messages in community channels"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND room_id IN (
      SELECT cr.id FROM public.chat_rooms cr
      WHERE cr.community_id IS NOT NULL
      AND (
        cr.community_id IN (
          SELECT cm.community_id FROM public.community_members cm
          WHERE cm.user_id = auth.uid()
        )
        OR cr.community_id IN (
          SELECT c.id FROM public.communities c
          WHERE (c.settings->>'is_public')::boolean = true
        )
        OR auth.uid() IN (
          SELECT p.id FROM public.profiles p
          WHERE p.is_admin = true
        )
      )
    )
  );

-- ─── 4. Fix message_reactions policies for community channels ───
-- Same simplification — avoid has_community_access() calls

DROP POLICY IF EXISTS "Users can view reactions in their rooms" ON public.message_reactions;
CREATE POLICY "Users can view reactions in their rooms"
  ON public.message_reactions FOR SELECT
  USING (
    -- DM/group via chat_participants
    message_id IN (
      SELECT m.id FROM public.messages m
      WHERE m.room_id IN (SELECT public.get_user_room_ids())
    )
    -- Community channels (direct check, no SECURITY DEFINER)
    OR message_id IN (
      SELECT m.id FROM public.messages m
      JOIN public.chat_rooms cr ON cr.id = m.room_id
      WHERE cr.community_id IS NOT NULL
      AND (
        cr.community_id IN (
          SELECT cm.community_id FROM public.community_members cm
          WHERE cm.user_id = auth.uid()
        )
        OR cr.community_id IN (
          SELECT c.id FROM public.communities c
          WHERE (c.settings->>'is_public')::boolean = true
        )
        OR auth.uid() IN (
          SELECT p.id FROM public.profiles p
          WHERE p.is_admin = true
        )
      )
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
        AND (
          cr.community_id IN (
            SELECT cm.community_id FROM public.community_members cm
            WHERE cm.user_id = auth.uid()
          )
          OR cr.community_id IN (
            SELECT c.id FROM public.communities c
            WHERE (c.settings->>'is_public')::boolean = true
          )
          OR auth.uid() IN (
            SELECT p.id FROM public.profiles p
            WHERE p.is_admin = true
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can remove their reactions" ON public.message_reactions;
CREATE POLICY "Users can remove their reactions"
  ON public.message_reactions FOR DELETE
  USING (auth.uid() = user_id);
