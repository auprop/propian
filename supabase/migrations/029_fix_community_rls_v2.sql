-- ============================================================
-- 029 — Fix community channel RLS (v2)
-- ============================================================
-- Drop and recreate the policies from 028 to include:
-- - community_members access
-- - community owner access
-- - global admin (is_admin) access

-- Drop existing policies from 028 if they exist
DROP POLICY IF EXISTS "Community members can view community channels" ON public.chat_rooms;
DROP POLICY IF EXISTS "Community members can view messages in community channels" ON public.messages;
DROP POLICY IF EXISTS "Community members can send messages in community channels" ON public.messages;
DROP POLICY IF EXISTS "Community owner can create channels" ON public.chat_rooms;

-- ─── chat_rooms SELECT: community members / owners / admins ───

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

-- ─── messages SELECT: community members / owners / admins ───

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

-- ─── messages INSERT: community members / owners / admins ───

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

-- ─── chat_rooms INSERT: community owner + admins can create channels ───

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
