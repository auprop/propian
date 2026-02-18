-- Leaderboard cache
create table public.leaderboard_cache (
  user_id uuid references public.profiles(id) on delete cascade,
  period text not null check (period in ('weekly', 'monthly', 'all_time')),
  rank integer not null,
  roi numeric(10,2),
  win_rate numeric(5,2),
  profit_factor numeric(5,2),
  total_trades integer default 0,
  cached_at timestamptz default now(),
  primary key (user_id, period)
);

-- Indexes
create index idx_leaderboard_period_rank on public.leaderboard_cache(period, rank);

-- RLS
alter table public.leaderboard_cache enable row level security;
create policy "Leaderboard is viewable by everyone" on public.leaderboard_cache for select using (true);
