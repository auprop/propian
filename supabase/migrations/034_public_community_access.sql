-- ============================================================
-- 034 — Allow public community access without membership
-- ============================================================
-- Public communities (settings->>'is_public' = 'true') should let
-- any authenticated user view channels, categories, roles, and messages
-- without being in community_members. Auto-join on the frontend
-- handles adding them to the member list.

-- Helper: check if a community is public
CREATE OR REPLACE FUNCTION public.is_public_community(p_community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.communities
    WHERE id = p_community_id
    AND (settings->>'is_public')::boolean = true
  );
$$;

-- Update has_community_access to include public communities
CREATE OR REPLACE FUNCTION public.has_community_access(p_community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_public_community(p_community_id)
    OR public.is_community_member(p_community_id)
    OR public.is_community_owner(p_community_id)
    OR public.is_admin();
$$;

-- No need to recreate policies — they all already call has_community_access()
-- which now includes the public community check.
