-- Economic Calendar

-- Economic events (populated by Gemini sync API route)
create table public.economic_events (
  id uuid default gen_random_uuid() primary key,
  source_id text unique not null,
  event_date date not null,
  event_time time not null,
  country text not null check (country in ('us', 'eu', 'gb', 'jp', 'au', 'ca', 'ch', 'nz', 'cn')),
  currency text not null,
  name text not null,
  impact text not null check (impact in ('high', 'medium', 'low')),
  actual text,
  forecast text,
  previous text,
  actual_direction text check (actual_direction in ('positive', 'negative', 'neutral')),
  description text,
  tags text[] default '{}',
  source text default 'gemini',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_economic_events_date on public.economic_events(event_date);
create index idx_economic_events_date_country on public.economic_events(event_date, country);
create index idx_economic_events_date_impact on public.economic_events(event_date, impact);

-- RLS: anyone authenticated can read, only service_role can write
alter table public.economic_events enable row level security;
create policy "Anyone can read economic events"
  on public.economic_events for select
  using (true);

-- Updated at trigger (reuses existing handle_updated_at from migration 001)
create trigger economic_events_updated_at
  before update on public.economic_events
  for each row execute procedure public.handle_updated_at();

-- ─────────────────────────────────────────────────────────

-- User event alerts (subscriptions)
create table public.event_alerts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  event_name text not null,
  country text not null check (country in ('us', 'eu', 'gb', 'jp', 'au', 'ca', 'ch', 'nz', 'cn')),
  currency text not null,
  impact text not null check (impact in ('high', 'medium', 'low')),
  enabled boolean default true,
  notify_minutes_before integer default 15 check (notify_minutes_before in (5, 15, 30, 60, 1440)),
  push_enabled boolean default true,
  email_enabled boolean default false,
  inapp_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, event_name, country)
);

-- Indexes
create index idx_event_alerts_user on public.event_alerts(user_id);

-- RLS: owner-only CRUD
alter table public.event_alerts enable row level security;
create policy "Users can view own alerts"
  on public.event_alerts for select using (auth.uid() = user_id);
create policy "Users can create alerts"
  on public.event_alerts for insert with check (auth.uid() = user_id);
create policy "Users can update own alerts"
  on public.event_alerts for update using (auth.uid() = user_id);
create policy "Users can delete own alerts"
  on public.event_alerts for delete using (auth.uid() = user_id);

-- Updated at trigger
create trigger event_alerts_updated_at
  before update on public.event_alerts
  for each row execute procedure public.handle_updated_at();
