-- ============================================================
-- Migration 008: Bug fixes
-- 1. Missing RPC: increment_helpful_count
-- 2. Missing RPC: find_dm_room
-- 3. Leaderboard population function + trigger
-- 4. User preferences table for settings persistence
-- ============================================================

-- ─── 1. increment_helpful_count RPC ────────────────────────
-- Inserts a vote row (which triggers handle_review_vote_change to
-- bump helpful_count). If the user already voted, it removes the
-- vote (toggle behaviour).

create or replace function public.increment_helpful_count(review_id uuid)
returns void as $$
declare
  _uid uuid := auth.uid();
  _exists boolean;
begin
  select exists(
    select 1 from public.review_votes rv
    where rv.user_id = _uid and rv.review_id = increment_helpful_count.review_id
  ) into _exists;

  if _exists then
    delete from public.review_votes rv
    where rv.user_id = _uid and rv.review_id = increment_helpful_count.review_id;
  else
    insert into public.review_votes (user_id, review_id)
    values (_uid, increment_helpful_count.review_id);
  end if;
end;
$$ language plpgsql security definer;


-- ─── 2. find_dm_room RPC ───────────────────────────────────
-- Returns the room_id of an existing DM between two users, or NULL.

create or replace function public.find_dm_room(user_a uuid, user_b uuid)
returns uuid as $$
  select cr.id
  from public.chat_rooms cr
  where cr.type = 'dm'
    and exists (
      select 1 from public.chat_participants cp
      where cp.room_id = cr.id and cp.user_id = user_a
    )
    and exists (
      select 1 from public.chat_participants cp
      where cp.room_id = cr.id and cp.user_id = user_b
    )
  limit 1;
$$ language sql security definer;


-- ─── 3. Leaderboard population ─────────────────────────────
-- Function computes rankings from closed trades and upserts into
-- leaderboard_cache. Can be called via cron or manually.

create or replace function public.refresh_leaderboard()
returns void as $$
begin
  -- Clear existing cache
  delete from public.leaderboard_cache;

  -- Insert rankings for each period
  -- Weekly: trades from last 7 days
  insert into public.leaderboard_cache (user_id, period, rank, roi, win_rate, profit_factor, total_trades, cached_at)
  select
    user_id,
    'weekly',
    row_number() over (order by sum(coalesce(pnl, 0)) desc),
    round(case when count(*) > 0 then sum(coalesce(pnl, 0)) / count(*) else 0 end, 2),
    round(count(*) filter (where coalesce(pnl, 0) > 0)::numeric / nullif(count(*), 0) * 100, 2),
    round(
      case
        when sum(case when coalesce(pnl, 0) < 0 then abs(coalesce(pnl, 0)) else 0 end) = 0 then
          case when sum(case when coalesce(pnl, 0) > 0 then coalesce(pnl, 0) else 0 end) > 0 then 999.99 else 0 end
        else sum(case when coalesce(pnl, 0) > 0 then coalesce(pnl, 0) else 0 end) /
             sum(case when coalesce(pnl, 0) < 0 then abs(coalesce(pnl, 0)) else 0 end)
      end, 2
    ),
    count(*),
    now()
  from public.trades
  where status = 'closed'
    and closed_at >= now() - interval '7 days'
  group by user_id
  having count(*) >= 1;

  -- Monthly: trades from last 30 days
  insert into public.leaderboard_cache (user_id, period, rank, roi, win_rate, profit_factor, total_trades, cached_at)
  select
    user_id,
    'monthly',
    row_number() over (order by sum(coalesce(pnl, 0)) desc),
    round(case when count(*) > 0 then sum(coalesce(pnl, 0)) / count(*) else 0 end, 2),
    round(count(*) filter (where coalesce(pnl, 0) > 0)::numeric / nullif(count(*), 0) * 100, 2),
    round(
      case
        when sum(case when coalesce(pnl, 0) < 0 then abs(coalesce(pnl, 0)) else 0 end) = 0 then
          case when sum(case when coalesce(pnl, 0) > 0 then coalesce(pnl, 0) else 0 end) > 0 then 999.99 else 0 end
        else sum(case when coalesce(pnl, 0) > 0 then coalesce(pnl, 0) else 0 end) /
             sum(case when coalesce(pnl, 0) < 0 then abs(coalesce(pnl, 0)) else 0 end)
      end, 2
    ),
    count(*),
    now()
  from public.trades
  where status = 'closed'
    and closed_at >= now() - interval '30 days'
  group by user_id
  having count(*) >= 1;

  -- All time
  insert into public.leaderboard_cache (user_id, period, rank, roi, win_rate, profit_factor, total_trades, cached_at)
  select
    user_id,
    'all_time',
    row_number() over (order by sum(coalesce(pnl, 0)) desc),
    round(case when count(*) > 0 then sum(coalesce(pnl, 0)) / count(*) else 0 end, 2),
    round(count(*) filter (where coalesce(pnl, 0) > 0)::numeric / nullif(count(*), 0) * 100, 2),
    round(
      case
        when sum(case when coalesce(pnl, 0) < 0 then abs(coalesce(pnl, 0)) else 0 end) = 0 then
          case when sum(case when coalesce(pnl, 0) > 0 then coalesce(pnl, 0) else 0 end) > 0 then 999.99 else 0 end
        else sum(case when coalesce(pnl, 0) > 0 then coalesce(pnl, 0) else 0 end) /
             sum(case when coalesce(pnl, 0) < 0 then abs(coalesce(pnl, 0)) else 0 end)
      end, 2
    ),
    count(*),
    now()
  from public.trades
  where status = 'closed'
  group by user_id
  having count(*) >= 1;
end;
$$ language plpgsql security definer;

-- Auto-refresh leaderboard when trades are inserted, updated, or deleted
create or replace function public.handle_leaderboard_refresh()
returns trigger as $$
begin
  perform public.refresh_leaderboard();
  return null;
end;
$$ language plpgsql security definer;

create trigger on_trade_leaderboard_refresh
  after insert or update or delete on public.trades
  for each statement execute procedure public.handle_leaderboard_refresh();


-- ─── 4. User preferences table ────────────────────────────
create table public.user_preferences (
  user_id uuid references public.profiles(id) on delete cascade primary key,

  -- Notification prefs
  email_mentions boolean default true,
  email_follows boolean default true,
  email_reviews boolean default false,
  email_marketing boolean default false,
  push_mentions boolean default true,
  push_likes boolean default true,
  push_follows boolean default true,
  push_comments boolean default true,
  push_reviews boolean default true,
  inapp_all boolean default true,

  -- Privacy prefs
  profile_visible boolean default true,
  activity_status boolean default true,
  search_visible boolean default true,
  show_trading_stats boolean default true,

  updated_at timestamptz default now()
);

-- RLS
alter table public.user_preferences enable row level security;
create policy "Users can view own preferences" on public.user_preferences for select using (auth.uid() = user_id);
create policy "Users can insert own preferences" on public.user_preferences for insert with check (auth.uid() = user_id);
create policy "Users can update own preferences" on public.user_preferences for update using (auth.uid() = user_id);

-- Auto-create preferences when a profile is created
create or replace function public.handle_new_preferences()
returns trigger as $$
begin
  insert into public.user_preferences (user_id) values (NEW.id)
  on conflict (user_id) do nothing;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_profile_create_preferences
  after insert on public.profiles
  for each row execute procedure public.handle_new_preferences();

-- Updated at trigger
create trigger user_preferences_updated_at
  before update on public.user_preferences
  for each row execute procedure public.handle_updated_at();
