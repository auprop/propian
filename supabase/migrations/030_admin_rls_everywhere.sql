-- ============================================================
-- 030 — Add global admin access to all community RLS policies
-- ============================================================
-- Admins (profiles.is_admin = true) should have full access to
-- all community resources, even if they're not a member.

-- ═══════════════════════════════════════════════════
-- community_categories: add admin SELECT access
-- ═══════════════════════════════════════════════════

DROP POLICY IF EXISTS "Members can view categories" ON public.community_categories;
CREATE POLICY "Members can view categories"
  ON public.community_categories FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM public.community_members WHERE user_id = auth.uid()
    )
    OR community_id IN (
      SELECT id FROM public.communities WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Also fix the "all" policy to include admins
DROP POLICY IF EXISTS "Owner/admin can manage categories" ON public.community_categories;
CREATE POLICY "Owner/admin can manage categories"
  ON public.community_categories FOR ALL
  USING (
    community_id IN (
      SELECT id FROM public.communities WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ═══════════════════════════════════════════════════
-- community_roles: add admin SELECT access
-- ═══════════════════════════════════════════════════

DROP POLICY IF EXISTS "Members can view roles" ON public.community_roles;
CREATE POLICY "Members can view roles"
  ON public.community_roles FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM public.community_members WHERE user_id = auth.uid()
    )
    OR community_id IN (
      SELECT id FROM public.communities WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Owner can manage roles" ON public.community_roles;
CREATE POLICY "Owner can manage roles"
  ON public.community_roles FOR ALL
  USING (
    community_id IN (
      SELECT id FROM public.communities WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ═══════════════════════════════════════════════════
-- community_members: add admin access
-- ═══════════════════════════════════════════════════

DROP POLICY IF EXISTS "Members can view other members" ON public.community_members;
CREATE POLICY "Members can view other members"
  ON public.community_members FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM public.community_members WHERE user_id = auth.uid()
    )
    OR community_id IN (
      SELECT id FROM public.communities WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Owner can manage members" ON public.community_members;
CREATE POLICY "Owner can manage members"
  ON public.community_members FOR ALL
  USING (
    community_id IN (
      SELECT id FROM public.communities WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ═══════════════════════════════════════════════════
-- knowledge_pins: add admin access
-- ═══════════════════════════════════════════════════

DROP POLICY IF EXISTS "Members can view pins" ON public.knowledge_pins;
CREATE POLICY "Members can view pins"
  ON public.knowledge_pins FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM public.community_members WHERE user_id = auth.uid()
    )
    OR community_id IN (
      SELECT id FROM public.communities WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Members can create pins" ON public.knowledge_pins;
CREATE POLICY "Members can create pins"
  ON public.knowledge_pins FOR INSERT
  WITH CHECK (
    auth.uid() = pinned_by
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

-- ═══════════════════════════════════════════════════
-- message_reactions: add admin/community-member access
-- ═══════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view reactions in their rooms" ON public.message_reactions;
CREATE POLICY "Users can view reactions in their rooms"
  ON public.message_reactions FOR SELECT
  USING (
    -- DM/group room participant
    message_id IN (
      SELECT m.id FROM public.messages m
      JOIN public.chat_participants cp ON cp.room_id = m.room_id
      WHERE cp.user_id = auth.uid()
    )
    -- Community channel member/owner/admin
    OR message_id IN (
      SELECT m.id FROM public.messages m
      JOIN public.chat_rooms cr ON cr.id = m.room_id
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

DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
CREATE POLICY "Users can add reactions"
  ON public.message_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- DM/group room participant
      message_id IN (
        SELECT m.id FROM public.messages m
        JOIN public.chat_participants cp ON cp.room_id = m.room_id
        WHERE cp.user_id = auth.uid()
      )
      -- Community channel member/owner/admin
      OR message_id IN (
        SELECT m.id FROM public.messages m
        JOIN public.chat_rooms cr ON cr.id = m.room_id
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
    )
  );
