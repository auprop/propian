-- ============================================================
-- 048 — Academy backend: podcasts, new columns, fix RLS
-- ============================================================
-- Adds podcasts table, extends courses/lessons for Bunny.net
-- video hosting, and fixes admin RLS recursion on academy
-- tables (046 used raw EXISTS on profiles; must use is_admin()).

-- ═══════════════════════════════════════════════════
-- 1. New table: podcasts
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.podcasts (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title         text NOT NULL,
  guest         text,
  duration      text NOT NULL DEFAULT '00:00',
  plays_count   integer NOT NULL DEFAULT 0,
  publish_date  date,
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'scheduled', 'published')),
  audio_url     text,
  description   text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;

-- Public can read published podcasts
CREATE POLICY "Anyone can view published podcasts"
  ON public.podcasts FOR SELECT
  USING (status = 'published');

-- Admins have full access
CREATE POLICY "Admins can manage podcasts"
  ON public.podcasts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ═══════════════════════════════════════════════════
-- 2. New columns on courses
-- ═══════════════════════════════════════════════════

-- status: draft | published | archived
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'archived'));

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS tags text[];

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS certificate_enabled boolean NOT NULL DEFAULT true;

-- ═══════════════════════════════════════════════════
-- 3. New column on lessons (Bunny.net video ID)
-- ═══════════════════════════════════════════════════

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS bunny_video_id text;

-- ═══════════════════════════════════════════════════
-- 4. Fix admin RLS policies on academy tables
--    (replace recursive EXISTS with is_admin())
-- ═══════════════════════════════════════════════════

-- ─── courses ───
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
CREATE POLICY "Admins can manage courses"
  ON public.courses FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── instructors ───
DROP POLICY IF EXISTS "Admins can manage instructors" ON public.instructors;
CREATE POLICY "Admins can manage instructors"
  ON public.instructors FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── lessons ───
DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
CREATE POLICY "Admins can manage lessons"
  ON public.lessons FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── course_modules ───
DROP POLICY IF EXISTS "Admins can manage course modules" ON public.course_modules;
CREATE POLICY "Admins can manage course modules"
  ON public.course_modules FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── quiz_questions (no admin policy existed before) ───
CREATE POLICY "Admins can manage quiz questions"
  ON public.quiz_questions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── user_course_progress (admin read-only) ───
CREATE POLICY "Admins can view all course progress"
  ON public.user_course_progress FOR SELECT
  USING (public.is_admin());

-- ─── certificates (admin read-only) ───
CREATE POLICY "Admins can view all certificates"
  ON public.certificates FOR SELECT
  USING (public.is_admin());

-- ─── instructor_reviews (admin read + delete) ───
CREATE POLICY "Admins can view all instructor reviews"
  ON public.instructor_reviews FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can delete instructor reviews"
  ON public.instructor_reviews FOR DELETE
  USING (public.is_admin());

-- ═══════════════════════════════════════════════════
-- 5. Indexes
-- ═══════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_podcasts_status
  ON public.podcasts(status);

CREATE INDEX IF NOT EXISTS idx_courses_status
  ON public.courses(status);

CREATE INDEX IF NOT EXISTS idx_lessons_bunny
  ON public.lessons(bunny_video_id)
  WHERE bunny_video_id IS NOT NULL;

-- ═══════════════════════════════════════════════════
-- 6. Seed podcast data
-- ═══════════════════════════════════════════════════

INSERT INTO public.podcasts (title, guest, duration, plays_count, publish_date, status, description) VALUES
  ('How I Passed FTMO in 7 Days', 'Marcus Chen', '42:18', 12842, '2026-02-20', 'published',
   'Marcus shares his exact strategy and daily routine that helped him pass the FTMO challenge in just 7 trading days.'),
  ('Prop Firm Red Flags to Watch For', 'Sarah Kim', '38:45', 8426, '2026-02-13', 'published',
   'Sarah breaks down the warning signs of unreliable prop firms and how to protect yourself from scams.'),
  ('From $0 to $100K Funded — My Journey', 'James Wright', '55:12', 18240, '2026-02-06', 'published',
   'James tells his incredible story of going from zero trading experience to managing a $100K funded account.'),
  ('Risk Management Secrets of Top Traders', 'Elena Vasquez', '47:30', 14680, '2026-01-30', 'published',
   'Elena reveals the risk management frameworks used by consistently profitable prop traders.'),
  ('The Truth About Scaling Plans', 'Alex Rivera', '36:22', 9842, '2026-01-23', 'published',
   'Alex analyzes the scaling plans offered by major prop firms and which ones offer the best value.'),
  ('Crypto Prop Firms — Are They Worth It?', 'David Okonkwo', '41:08', 0, '2026-02-27', 'scheduled',
   'David explores the emerging world of crypto prop firms and whether they are a viable option for traders.'),
  ('Trading Psychology Deep Dive', 'Elena Vasquez', '52:00', 0, NULL, 'draft',
   'An in-depth exploration of the psychological challenges traders face and practical techniques to overcome them.');
