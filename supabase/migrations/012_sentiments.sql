-- ─── Market Sentiments ───

-- Live snapshot per instrument
create table public.sentiments (
  id uuid default gen_random_uuid() primary key,
  symbol text not null unique,
  long_pct numeric(5,2) not null check (long_pct between 0 and 100),
  short_pct numeric(5,2) not null check (short_pct between 0 and 100),
  positions integer not null default 0,
  price text not null default '',
  price_change text not null default '',
  price_change_up boolean not null default true,
  updated_at timestamptz default now(),

  constraint sentiments_pct_sum check (long_pct + short_pct = 100)
);

create index idx_sentiments_symbol on public.sentiments(symbol);

-- Hourly snapshots for history charts
create table public.sentiment_history (
  id uuid default gen_random_uuid() primary key,
  symbol text not null,
  long_pct numeric(5,2) not null,
  short_pct numeric(5,2) not null,
  positions integer not null default 0,
  snapshot_at timestamptz not null default now()
);

create index idx_sentiment_history_symbol_time
  on public.sentiment_history(symbol, snapshot_at desc);

-- ─── RLS (public read) ───

alter table public.sentiments enable row level security;
create policy "Sentiments are viewable by everyone"
  on public.sentiments for select using (true);

alter table public.sentiment_history enable row level security;
create policy "Sentiment history is viewable by everyone"
  on public.sentiment_history for select using (true);

-- ─── Seed: Live Sentiments ───

insert into public.sentiments (symbol, long_pct, short_pct, positions, price, price_change, price_change_up) values
  -- Forex
  ('EURUSD', 44, 56, 189, '1.08420', '-0.15%', false),
  ('GBPUSD', 57, 43, 142, '1.26340', '+0.28%', true),
  ('USDJPY', 38, 62, 128, '149.850', '+0.33%', true),
  ('USDCHF', 55, 45,  52, '0.87620', '+0.11%', true),
  ('AUDUSD', 52, 48,  67, '0.65180', '-0.08%', false),
  ('USDCAD', 41, 59,  58, '1.35720', '+0.19%', true),
  ('NZDUSD', 48, 52,  39, '0.60850', '-0.22%', false),
  ('EURGBP', 46, 54,  44, '0.85810', '-0.06%', false),
  ('EURJPY', 61, 39,  73, '162.380', '+0.47%', true),
  ('GBPJPY', 58, 42,  65, '189.250', '+0.61%', true),
  ('EURCHF', 50, 50,  28, '0.94920', '+0.02%', true),
  ('EURAUD', 43, 57,  31, '1.66480', '-0.34%', false),
  ('GBPAUD', 54, 46,  27, '1.93920', '+0.14%', true),
  ('AUDJPY', 60, 40,  35, '97.560',  '+0.52%', true),
  ('CADJPY', 56, 44,  30, '110.380', '+0.38%', true),
  -- Metals
  ('XAUUSD', 68, 32, 312, '2,048.30', '+0.42%', true),
  ('XAGUSD', 72, 28,  45, '24.180',   '+1.15%', true),
  -- Indices
  ('US30',   63, 37,  78, '38,920', '+0.54%', true),
  ('US500',  66, 34,  85, '5,124',  '+0.67%', true),
  ('NAS100', 71, 29,  84, '18,240', '+0.87%', true),
  ('UK100',  51, 49,  32, '7,680',  '-0.12%', false),
  ('GER40',  59, 41,  38, '17,420', '+0.31%', true),
  ('JPN225', 47, 53,  29, '38,150', '-0.45%', false),
  -- Crypto
  ('BTCUSD', 74, 26,  96, '67,420', '+2.14%', true),
  ('ETHUSD', 79, 21,  58, '3,842',  '+3.41%', true),
  ('SOLUSD', 81, 19,  34, '142.80', '+4.72%', true);

-- ─── Seed: Sentiment History (24 hourly snapshots per instrument) ───
-- Using generate_series to create 24 hourly snapshots going back 24h
-- Each snapshot has a slight random-ish fluctuation from the base

do $$
declare
  r record;
  h integer;
  base_long numeric;
  snap_long numeric;
begin
  for r in select symbol, long_pct, positions from public.sentiments loop
    base_long := r.long_pct;
    for h in 0..23 loop
      -- Oscillate ±5 around the base, clamped to 5-95
      snap_long := greatest(5, least(95,
        base_long + (sin(h * 0.7 + ascii(left(r.symbol, 1))) * 5)::numeric(5,2)
      ));
      snap_long := round(snap_long, 2);

      insert into public.sentiment_history (symbol, long_pct, short_pct, positions, snapshot_at)
      values (
        r.symbol,
        snap_long,
        100 - snap_long,
        greatest(1, r.positions + (sin(h * 1.1) * 10)::integer),
        now() - ((23 - h) || ' hours')::interval
      );
    end loop;
  end loop;
end $$;
