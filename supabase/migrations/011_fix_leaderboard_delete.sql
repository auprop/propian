-- Fix: "DELETE requires a WHERE clause" error on leaderboard_cache
-- Supabase blocks bare DELETE (without WHERE) on RLS-enabled tables,
-- even inside SECURITY DEFINER functions. Adding "WHERE true" satisfies
-- the safety check while still clearing all rows.

create or replace function public.refresh_leaderboard()
returns void as $$
begin
  -- Clear existing cache (WHERE true required by Supabase RLS safety check)
  delete from public.leaderboard_cache where true;

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
