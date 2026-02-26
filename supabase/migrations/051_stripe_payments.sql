-- ─── Stripe Payments ───
-- Adds payment infrastructure for one-time course purchases and Pro subscriptions.

-- ═══════════════════════════════════════════
-- 1. Profile columns for Stripe
-- ═══════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pro_subscription_status text DEFAULT NULL
    CHECK (pro_subscription_status IN ('active', 'past_due', 'canceled', 'trialing', NULL));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pro_subscription_id text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer
  ON public.profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ═══════════════════════════════════════════
-- 2. Course columns for pricing
-- ═══════════════════════════════════════════

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS price_type text NOT NULL DEFAULT 'free'
    CHECK (price_type IN ('free', 'one_time', 'pro_only'));

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS price_cents integer DEFAULT 0
    CHECK (price_cents >= 0);

-- Migrate existing price text → price_type + price_cents
UPDATE public.courses SET
  price_type = 'free',
  price_cents = 0
WHERE price = 'Free' OR price IS NULL;

UPDATE public.courses SET
  price_type = 'one_time',
  price_cents = CAST(REPLACE(REPLACE(price, '$', ''), ',', '') AS numeric) * 100
WHERE price IS NOT NULL AND price != 'Free' AND price LIKE '$%';

-- ═══════════════════════════════════════════
-- 3. Purchases table (one-time course payments)
-- ═══════════════════════════════════════════

CREATE TABLE public.purchases (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id             uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  stripe_session_id     text UNIQUE NOT NULL,
  stripe_payment_intent text,
  amount_cents          integer NOT NULL,
  currency              text NOT NULL DEFAULT 'usd',
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  created_at            timestamptz DEFAULT now(),
  completed_at          timestamptz,
  UNIQUE (user_id, course_id)
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "purchases_user_select"
  ON public.purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all purchases
CREATE POLICY "purchases_admin_select"
  ON public.purchases FOR SELECT
  USING (public.is_admin());

CREATE INDEX idx_purchases_user ON public.purchases(user_id);
CREATE INDEX idx_purchases_stripe_session ON public.purchases(stripe_session_id);
CREATE INDEX idx_purchases_course ON public.purchases(course_id);

-- ═══════════════════════════════════════════
-- 4. Subscriptions table (Pro subscription lifecycle)
-- ═══════════════════════════════════════════

CREATE TABLE public.subscriptions (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_subscription_id  text UNIQUE NOT NULL,
  stripe_customer_id      text NOT NULL,
  status                  text NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete', 'unpaid')),
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean DEFAULT false,
  canceled_at             timestamptz,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "subscriptions_user_select"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "subscriptions_admin_select"
  ON public.subscriptions FOR SELECT
  USING (public.is_admin());

CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);

-- Updated-at trigger (reuse handle_updated_at from migration 001)
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ═══════════════════════════════════════════
-- 5. Helper: check if user has access to a course
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.has_course_access(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN (SELECT price_type FROM courses WHERE id = p_course_id) = 'free' THEN true
      WHEN (SELECT price_type FROM courses WHERE id = p_course_id) = 'one_time' THEN
        EXISTS (SELECT 1 FROM purchases WHERE user_id = auth.uid() AND course_id = p_course_id AND status = 'completed')
      WHEN (SELECT price_type FROM courses WHERE id = p_course_id) = 'pro_only' THEN
        COALESCE(
          (SELECT pro_subscription_status FROM profiles WHERE id = auth.uid()) = 'active'
          OR (SELECT pro_expires_at FROM profiles WHERE id = auth.uid()) > now(),
          false
        )
      ELSE false
    END;
$$;
