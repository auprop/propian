-- ============================================================
-- 047 — Fix admin RLS recursion on profiles table
-- ============================================================
-- Migration 046 used raw EXISTS queries on profiles to check admin status,
-- causing infinite recursion when the SELECT policy itself references profiles.
-- Fix: use the SECURITY DEFINER function public.is_admin() from migration 031.

-- ─── Fix profiles SELECT policy ───
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- ─── Fix profiles UPDATE policy ───
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- ─── Add profiles DELETE policy (for admin user deletion) ───
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
CREATE POLICY "Admins can delete any profile"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- ─── Also fix posts/comments/firms policies to use is_admin() for consistency ───

DROP POLICY IF EXISTS "Admins can delete any post" ON public.posts;
CREATE POLICY "Admins can delete any post"
  ON public.posts FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update any post" ON public.posts;
CREATE POLICY "Admins can update any post"
  ON public.posts FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete any comment" ON public.comments;
CREATE POLICY "Admins can delete any comment"
  ON public.comments FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update firms" ON public.firms;
CREATE POLICY "Admins can update firms"
  ON public.firms FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert firms" ON public.firms;
CREATE POLICY "Admins can insert firms"
  ON public.firms FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete firms" ON public.firms;
CREATE POLICY "Admins can delete firms"
  ON public.firms FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete any review" ON public.firm_reviews;
CREATE POLICY "Admins can delete any review"
  ON public.firm_reviews FOR DELETE
  USING (public.is_admin());
