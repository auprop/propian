-- ============================================================
-- 046 — Admin Dashboard: new tables, columns, and RLS policies
-- ============================================================

-- ═══════════════════════════════════════════════════
-- 1. Profile moderation columns
-- ═══════════════════════════════════════════════════

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shadowbanned boolean DEFAULT false;

-- ═══════════════════════════════════════════════════
-- 2. Firm featured column
-- ═══════════════════════════════════════════════════

ALTER TABLE public.firms ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- ═══════════════════════════════════════════════════
-- 3. Admin RLS on profiles (full read + moderation update)
-- ═══════════════════════════════════════════════════

-- Allow admins to view ALL profiles (including banned)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Allow admins to update any profile (ban, verify, etc.)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- ═══════════════════════════════════════════════════
-- 4. Admin RLS on posts (delete any post)
-- ═══════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admins can delete any post" ON public.posts;
CREATE POLICY "Admins can delete any post"
  ON public.posts FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admins can update any post" ON public.posts;
CREATE POLICY "Admins can update any post"
  ON public.posts FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ═══════════════════════════════════════════════════
-- 5. Admin RLS on comments (delete any comment)
-- ═══════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admins can delete any comment" ON public.comments;
CREATE POLICY "Admins can delete any comment"
  ON public.comments FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ═══════════════════════════════════════════════════
-- 6. Admin RLS on firms (update/delete)
-- ═══════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admins can update firms" ON public.firms;
CREATE POLICY "Admins can update firms"
  ON public.firms FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admins can insert firms" ON public.firms;
CREATE POLICY "Admins can insert firms"
  ON public.firms FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admins can delete firms" ON public.firms;
CREATE POLICY "Admins can delete firms"
  ON public.firms FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ═══════════════════════════════════════════════════
-- 7. Admin RLS on firm reviews (delete)
-- ═══════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admins can delete any review" ON public.firm_reviews;
CREATE POLICY "Admins can delete any review"
  ON public.firm_reviews FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ═══════════════════════════════════════════════════
-- 8. Post reports table
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.post_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam', 'harassment', 'illegal', 'bullying', 'misinformation', 'other')),
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_post_reports_status ON public.post_reports(status);
CREATE INDEX IF NOT EXISTS idx_post_reports_post ON public.post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_created ON public.post_reports(created_at DESC);

ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can report content"
  ON public.post_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view own reports
CREATE POLICY "Users can view own reports"
  ON public.post_reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON public.post_reports FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Admins can update reports (resolve/dismiss)
CREATE POLICY "Admins can update reports"
  ON public.post_reports FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ═══════════════════════════════════════════════════
-- 9. Moderation actions log
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.mod_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  action text NOT NULL CHECK (action IN ('ban', 'unban', 'shadowban', 'unshadowban', 'delete_post', 'delete_comment', 'warn', 'verify', 'unverify', 'delete_review', 'resolve_report', 'dismiss_report')),
  target_type text NOT NULL CHECK (target_type IN ('user', 'post', 'comment', 'review', 'report')),
  target_id uuid NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mod_actions_admin ON public.mod_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_mod_actions_created ON public.mod_actions(created_at DESC);

ALTER TABLE public.mod_actions ENABLE ROW LEVEL SECURITY;

-- Only admins can view/insert mod actions
CREATE POLICY "Admins can view mod actions"
  ON public.mod_actions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can create mod actions"
  ON public.mod_actions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ═══════════════════════════════════════════════════
-- 10. Auto-moderation rules
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.auto_mod_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  pattern text,
  action text NOT NULL CHECK (action IN ('hide', 'flag', 'block', 'mute', 'hold')),
  action_detail text,
  matches_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.auto_mod_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage auto mod rules"
  ON public.auto_mod_rules FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ═══════════════════════════════════════════════════
-- 11. Comparison features config
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.comparison_features (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('range', '%', 'days', 'multi', 'select', 'bool', 'text')),
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.comparison_features ENABLE ROW LEVEL SECURITY;

-- Everyone can read comparison features
CREATE POLICY "Anyone can view comparison features"
  ON public.comparison_features FOR SELECT
  USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage comparison features"
  ON public.comparison_features FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ═══════════════════════════════════════════════════
-- 12. Algorithm config
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.algorithm_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  category text NOT NULL CHECK (category IN ('weight', 'signal', 'rule')),
  description text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.algorithm_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage algorithm config"
  ON public.algorithm_config FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ═══════════════════════════════════════════════════
-- 13. Admin RLS on academy tables
-- ═══════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
CREATE POLICY "Admins can manage courses"
  ON public.courses FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admins can manage instructors" ON public.instructors;
CREATE POLICY "Admins can manage instructors"
  ON public.instructors FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
CREATE POLICY "Admins can manage lessons"
  ON public.lessons FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admins can manage course modules" ON public.course_modules;
CREATE POLICY "Admins can manage course modules"
  ON public.course_modules FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ═══════════════════════════════════════════════════
-- 14. Seed comparison features
-- ═══════════════════════════════════════════════════

INSERT INTO public.comparison_features (name, type, is_active, sort_order) VALUES
  ('Account Size', 'range', true, 0),
  ('Profit Split', '%', true, 1),
  ('Max Daily Loss', '%', true, 2),
  ('Max Total Loss', '%', true, 3),
  ('Profit Target', '%', true, 4),
  ('Trading Period', 'days', true, 5),
  ('Instruments', 'multi', true, 6),
  ('Platform', 'multi', true, 7),
  ('Scaling Plan', 'bool', false, 8),
  ('Payout Frequency', 'select', false, 9)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════
-- 15. Seed algorithm config
-- ═══════════════════════════════════════════════════

INSERT INTO public.algorithm_config (key, value, category, description, is_active, sort_order) VALUES
  ('weight_quality', '35', 'weight', 'Quality', true, 0),
  ('weight_engagement', '25', 'weight', 'Engagement', true, 1),
  ('weight_recency', '20', 'weight', 'Recency', true, 2),
  ('weight_trust', '15', 'weight', 'Trust', true, 3),
  ('weight_diversity', '5', 'weight', 'Diversity', true, 4),
  ('signal_chart_analysis', '3.2', 'signal', 'Post with chart analysis', true, 0),
  ('signal_verified_badge', '2.8', 'signal', 'Verified trader badge', true, 1),
  ('signal_prop_proof', '2.5', 'signal', 'Passed prop challenge proof', true, 2),
  ('signal_helpful_comments', '2.0', 'signal', 'Helpful comments ratio', true, 3),
  ('signal_spam_keywords', '-5.0', 'signal', 'Spam keyword match', true, 4),
  ('signal_self_promo', '-3.0', 'signal', 'Self-promo ratio > 40%', true, 5),
  ('signal_clickbait', '-2.5', 'signal', 'Clickbait title pattern', true, 6),
  ('signal_follow_farming', '-3.5', 'signal', 'Follow-back farming', true, 7)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════
-- 16. Seed auto-mod rules
-- ═══════════════════════════════════════════════════

INSERT INTO public.auto_mod_rules (name, description, action, action_detail, is_active) VALUES
  ('Block telegram/discord links', 'Hide posts with external chat platform links', 'hide', 'Auto-hide + flag', true),
  ('Block guaranteed profit patterns', 'Warn on unrealistic profit claims', 'flag', 'Auto-hide + warn', true),
  ('Rate limit: >10 posts/hour', 'Temp mute excessive posters', 'mute', 'Temp mute 1h', true),
  ('Duplicate content detection', 'Block duplicate posts within 24h', 'block', 'Block + notify', true),
  ('New account posting links (<24h)', 'Hold link posts from new accounts', 'hold', 'Hold for review', true)
ON CONFLICT DO NOTHING;
