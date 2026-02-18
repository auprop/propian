-- Add market analysis column for released economic events
-- Populated by Gemini when actual values are detected during sync

alter table public.economic_events
  add column if not exists analysis jsonb;

-- analysis JSON structure:
-- {
--   "summary": "Came in below expectations (4.3% vs 4.6% forecast)",
--   "marketImpact": "GBP likely to weaken as lower wage growth reduces BOE rate hike pressure",
--   "tradingInsight": "Watch GBP/USD for short opportunities near resistance levels",
--   "sentiment": "bearish" | "bullish" | "neutral"
-- }

comment on column public.economic_events.analysis is
  'AI-generated market analysis when actual value is released. JSON with summary, marketImpact, tradingInsight, sentiment fields.';
