-- ============================================================
-- 050 — Auto-sync lessons_count and students_count on courses
-- ============================================================
-- Keeps courses.lessons_count and courses.students_count always
-- accurate via triggers, so every consumer (web, mobile, admin)
-- sees real numbers without extra queries.

-- ─── Lessons count trigger ───

CREATE OR REPLACE FUNCTION public.refresh_course_lessons_count()
RETURNS trigger AS $$
DECLARE
  target_course_id uuid;
BEGIN
  -- Determine which course_id was affected
  IF TG_OP = 'DELETE' THEN
    target_course_id := OLD.course_id;
  ELSE
    target_course_id := NEW.course_id;
  END IF;

  UPDATE public.courses
  SET lessons_count = (
    SELECT count(*)::integer
    FROM public.lessons
    WHERE course_id = target_course_id
  )
  WHERE id = target_course_id;

  RETURN NULL; -- after trigger, return value is ignored
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_lessons_count_sync
  AFTER INSERT OR DELETE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_course_lessons_count();

-- ─── Students count trigger ───

CREATE OR REPLACE FUNCTION public.refresh_course_students_count()
RETURNS trigger AS $$
DECLARE
  target_course_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_course_id := OLD.course_id;
  ELSE
    target_course_id := NEW.course_id;
  END IF;

  UPDATE public.courses
  SET students_count = (
    SELECT count(*)::integer
    FROM public.user_course_progress
    WHERE course_id = target_course_id
  )
  WHERE id = target_course_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_students_count_sync
  AFTER INSERT OR DELETE ON public.user_course_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_course_students_count();

-- ─── Fix existing stale data ───

UPDATE public.courses c
SET lessons_count = (
  SELECT count(*)::integer
  FROM public.lessons l
  WHERE l.course_id = c.id
);

UPDATE public.courses c
SET students_count = (
  SELECT count(*)::integer
  FROM public.user_course_progress ucp
  WHERE ucp.course_id = c.id
);
