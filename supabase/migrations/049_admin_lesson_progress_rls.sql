-- ============================================================
-- 049 — Admin read-only access to user_lesson_progress
-- ============================================================
-- Required for lesson drop-off analytics in the admin academy panel.

-- Admin can read all lesson progress records
CREATE POLICY "Admins can view all lesson progress"
  ON public.user_lesson_progress FOR SELECT
  USING (public.is_admin());

-- Index for efficient aggregation by lesson_id (drop-off chart queries)
CREATE INDEX IF NOT EXISTS idx_ulp_lesson
  ON public.user_lesson_progress(lesson_id);

-- Partial index for completed lessons (most common filter)
CREATE INDEX IF NOT EXISTS idx_ulp_lesson_completed
  ON public.user_lesson_progress(lesson_id)
  WHERE completed = true;
