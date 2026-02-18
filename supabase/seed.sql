-- Seed firms
insert into public.firms (name, slug, logo_text, logo_color, description, website, profit_split, max_drawdown, daily_drawdown, challenge_fee_min, payout_cycle, scaling_plan, pass_rate, total_payouts, rating_avg, review_count) values
  ('FTMO', 'ftmo', 'FT', '#2962ff', 'Leading prop trading firm with transparent rules and fast payouts.', 'https://ftmo.com', '80/20', '10%', '5%', 155, '14 days', true, '68%', '$4.2M', 4.70, 2841),
  ('Funded Next', 'funded-next', 'FN', '#00c853', 'Affordable prop firm with competitive challenge fees.', 'https://fundednext.com', '80/20', '10%', '5%', 99, '14 days', true, '54%', '$2.8M', 4.30, 1923),
  ('The 5%ers', 'the-5ers', '5%', '#ff6d00', 'Unique low-risk funding program for consistent traders.', 'https://the5ers.com', '50/50', '4%', null, 235, '14 days', true, '47%', '$1.6M', 4.10, 1204),
  ('MyForexFunds', 'myforexfunds', 'MF', '#d500f9', 'Budget-friendly prop firm with multiple account sizes.', 'https://myforexfunds.com', '75/25', '12%', '5%', 84, '14 days', false, '31%', '$890K', 3.20, 3102),
  ('True Forex Funds', 'true-forex-funds', 'TF', '#00bcd4', 'Reliable prop firm with reasonable challenge rules.', 'https://trueforexfunds.com', '80/20', '8%', '5%', 129, '14 days', true, '59%', '$1.1M', 4.50, 987),
  ('TopStep', 'topstep', 'TS', '#ff1744', 'Popular futures prop firm with strong community.', 'https://topstep.com', '90/10', '—', '—', 165, '14 days', true, '62%', '$3.1M', 4.40, 1567);

-- Seed trades (requires an existing user_id — use a placeholder that can be updated)
-- These are sample trades for development/testing only.
-- To use: replace the user_id with a real profile ID after signup.
-- Example: UPDATE public.trades SET user_id = '<your-profile-id>';

-- Note: Uncomment and run after creating a user account:
/*
insert into public.trades (user_id, pair, direction, entry_price, exit_price, lot_size, stop_loss, take_profit, pnl, pnl_pips, rr_ratio, status, emotion, confidence, tags, mistakes, notes, trade_date) values
  ('REPLACE_WITH_USER_ID', 'EURUSD', 'long', 1.08450, 1.08720, 0.50, 1.08300, 1.08800, 135.00, 27.0, 1.80, 'closed', 'confident', 4, '{"Breakout","Trend Follow"}', '{}', 'Clean breakout above resistance with strong momentum.', '2025-06-10'),
  ('REPLACE_WITH_USER_ID', 'XAUUSD', 'short', 2345.50, 2338.20, 0.10, 2350.00, 2335.00, 73.00, 73.0, 1.62, 'closed', 'neutral', 3, '{"Supply/Demand"}', '{}', 'Rejection from daily supply zone.', '2025-06-10'),
  ('REPLACE_WITH_USER_ID', 'GBPJPY', 'long', 198.350, 197.800, 0.30, 198.100, 199.000, -165.00, -55.0, -0.85, 'closed', 'fearful', 2, '{"Reversal"}', '{"Early Entry","Ignored Plan"}', 'Entered too early before confirmation. Need to wait for candle close.', '2025-06-09'),
  ('REPLACE_WITH_USER_ID', 'NAS100', 'long', 18950.00, 19120.00, 0.05, 18880.00, 19200.00, 85.00, 170.0, 2.43, 'closed', 'confident', 5, '{"Trend Follow","Order Block"}', '{}', 'Perfect entry on OB retest during NY session.', '2025-06-09'),
  ('REPLACE_WITH_USER_ID', 'EURUSD', 'short', 1.08900, 1.08650, 1.00, 1.09050, 1.08600, 250.00, 25.0, 1.67, 'closed', 'greedy', 3, '{"FVG"}', '{"Over-leveraged"}', 'Good setup but position was too large.', '2025-06-08'),
  ('REPLACE_WITH_USER_ID', 'USDJPY', 'long', 157.200, 157.200, 0.20, 156.900, 157.800, 0.00, 0.0, 0.00, 'closed', 'neutral', 2, '{"Range"}', '{}', 'Breakeven hit after market reversed.', '2025-06-07'),
  ('REPLACE_WITH_USER_ID', 'GBPUSD', 'long', 1.27150, 1.27450, 0.50, 1.26950, 1.27500, 150.00, 30.0, 1.50, 'closed', 'confident', 4, '{"Pullback"}', '{}', 'Pullback to 50 EMA during London session.', '2025-06-06'),
  ('REPLACE_WITH_USER_ID', 'XAUUSD', 'long', 2320.00, null, 0.10, 2310.00, 2340.00, null, null, null, 'open', 'neutral', 3, '{"Liquidity Sweep"}', '{}', 'Swept Asian lows, looking for reversal.', '2025-06-11'),
  ('REPLACE_WITH_USER_ID', 'BTCUSD', 'short', 71250.00, 70800.00, 0.01, 71500.00, 70500.00, 45.00, 450.0, 1.80, 'closed', 'revenge', 1, '{"News"}', '{"Revenge Trade","FOMO"}', 'Entered after missing previous move. Bad idea.', '2025-06-05'),
  ('REPLACE_WITH_USER_ID', 'US30', 'long', 39150.00, 39380.00, 0.10, 39050.00, 39400.00, 230.00, 230.0, 2.30, 'closed', 'confident', 5, '{"Breakout","Trend Follow"}', '{}', 'Beautiful breakout with volume confirmation.', '2025-06-04');
*/
