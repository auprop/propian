-- ============================================================
-- 027 — Admin role on profiles + restrict community creation
-- ============================================================

-- Add is_admin column
ALTER TABLE public.profiles ADD COLUMN is_admin boolean DEFAULT false;

-- Replace the open community creation policy with admin-only
DROP POLICY IF EXISTS "Authenticated users can create communities" ON public.communities;

CREATE POLICY "Admins can create communities"
  ON public.communities FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Set existing admin user(s)
UPDATE public.profiles SET is_admin = true WHERE username = 'asahi';
UPDATE public.profiles SET is_admin = true WHERE username = 'asifulfat';
