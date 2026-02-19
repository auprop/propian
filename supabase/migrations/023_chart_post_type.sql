-- Add 'chart' to the post type check constraint.
-- A chart post stores a TradingView symbol reference in media_urls[0]
-- using the format: tv://EXCHANGE:SYMBOL:INTERVAL (e.g. tv://FX:EURUSD:D)

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_type_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_type_check
  CHECK (type IN ('text', 'image', 'poll', 'quote', 'repost', 'chart'));
