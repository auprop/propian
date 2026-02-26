-- 052: Add Stripe product/price IDs to courses + app_settings table
-- Enables auto-syncing course pricing to Stripe Products

-- ─── Stripe IDs on courses ───
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- ─── App Settings (key-value store for global config) ───
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE TRIGGER set_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read settings
CREATE POLICY "Authenticated users can read settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can write settings
CREATE POLICY "Admins can insert settings"
  ON public.app_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update settings"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Seed default Pro subscription config
INSERT INTO public.app_settings (key, value)
VALUES (
  'stripe_pro',
  '{"product_id": null, "price_id": null, "amount_cents": 0, "interval": "month"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
