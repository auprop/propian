-- ============================================================
-- 031 — Fix RLS infinite recursion with security definer helper
-- ============================================================
-- The community_members SELECT policy references community_members itself,
-- causing infinite recursion. Fix by using a SECURITY DEFINER function
-- that bypasses RLS to check membership.

-- Helper: check if the current user is a member of a community
CREATE OR REPLACE FUNCTION public.is_community_member(p_community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = p_community_id AND user_id = auth.uid()
  );
$$;

-- Helper: check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Helper: check if the current user owns a community
CREATE OR REPLACE FUNCTION public.is_community_owner(p_community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.communities
    WHERE id = p_community_id AND owner_id = auth.uid()
  );
$$;

-- Helper: combined access check
CREATE OR REPLACE FUNCTION public.has_community_access(p_community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_community_member(p_community_id)
    OR public.is_community_owner(p_community_id)
    OR public.is_admin();
$$;

-- ═══════════════════════════════════════════════════
-- Now re-create ALL community-related policies using these functions
-- ═══════════════════════════════════════════════════

-- ─── community_members ───
DROP POLICY IF EXISTS "Members can view other members" ON public.community_members;
CREATE POLICY "Members can view other members"
  ON public.community_members FOR SELECT
  USING (public.has_community_access(community_id));

DROP POLICY IF EXISTS "Owner can manage members" ON public.community_members;
CREATE POLICY "Owner can manage members"
  ON public.community_members FOR ALL
  USING (public.is_community_owner(community_id) OR public.is_admin());

-- ─── community_categories ───
DROP POLICY IF EXISTS "Members can view categories" ON public.community_categories;
CREATE POLICY "Members can view categories"
  ON public.community_categories FOR SELECT
  USING (public.has_community_access(community_id));

DROP POLICY IF EXISTS "Owner/admin can manage categories" ON public.community_categories;
CREATE POLICY "Owner/admin can manage categories"
  ON public.community_categories FOR ALL
  USING (public.is_community_owner(community_id) OR public.is_admin());

-- ─── community_roles ───
DROP POLICY IF EXISTS "Members can view roles" ON public.community_roles;
CREATE POLICY "Members can view roles"
  ON public.community_roles FOR SELECT
  USING (public.has_community_access(community_id));

DROP POLICY IF EXISTS "Owner can manage roles" ON public.community_roles;
CREATE POLICY "Owner can manage roles"
  ON public.community_roles FOR ALL
  USING (public.is_community_owner(community_id) OR public.is_admin());

-- ─── chat_rooms (community channels) ───
DROP POLICY IF EXISTS "Community members can view community channels" ON public.chat_rooms;
CREATE POLICY "Community members can view community channels"
  ON public.chat_rooms FOR SELECT
  USING (
    community_id IS NOT NULL
    AND public.has_community_access(community_id)
  );

DROP POLICY IF EXISTS "Community owner can create channels" ON public.chat_rooms;
CREATE POLICY "Community owner can create channels"
  ON public.chat_rooms FOR INSERT
  WITH CHECK (
    community_id IS NOT NULL
    AND auth.uid() = created_by
    AND (public.is_community_owner(community_id) OR public.is_admin())
  );

-- ─── messages (community channels) ───
DROP POLICY IF EXISTS "Community members can view messages in community channels" ON public.messages;
CREATE POLICY "Community members can view messages in community channels"
  ON public.messages FOR SELECT
  USING (
    room_id IN (
      SELECT id FROM public.chat_rooms
      WHERE community_id IS NOT NULL
      AND public.has_community_access(community_id)
    )
  );

DROP POLICY IF EXISTS "Community members can send messages in community channels" ON public.messages;
CREATE POLICY "Community members can send messages in community channels"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND room_id IN (
      SELECT id FROM public.chat_rooms
      WHERE community_id IS NOT NULL
      AND public.has_community_access(community_id)
    )
  );

-- ─── knowledge_pins ───
DROP POLICY IF EXISTS "Members can view pins" ON public.knowledge_pins;
CREATE POLICY "Members can view pins"
  ON public.knowledge_pins FOR SELECT
  USING (public.has_community_access(community_id));

DROP POLICY IF EXISTS "Members can create pins" ON public.knowledge_pins;
CREATE POLICY "Members can create pins"
  ON public.knowledge_pins FOR INSERT
  WITH CHECK (
    auth.uid() = pinned_by
    AND public.has_community_access(community_id)
  );

-- ─── message_reactions (community channels) ───
DROP POLICY IF EXISTS "Users can view reactions in their rooms" ON public.message_reactions;
CREATE POLICY "Users can view reactions in their rooms"
  ON public.message_reactions FOR SELECT
  USING (
    -- DM/group via chat_participants
    message_id IN (
      SELECT m.id FROM public.messages m
      JOIN public.chat_participants cp ON cp.room_id = m.room_id
      WHERE cp.user_id = auth.uid()
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
        JOIN public.chat_participants cp ON cp.room_id = m.room_id
        WHERE cp.user_id = auth.uid()
      )
      OR message_id IN (
        SELECT m.id FROM public.messages m
        JOIN public.chat_rooms cr ON cr.id = m.room_id
        WHERE cr.community_id IS NOT NULL
        AND public.has_community_access(cr.community_id)
      )
    )
  );
