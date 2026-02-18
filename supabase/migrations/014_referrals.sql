-- ══════════════════════════════════════════════════════════════
--  014 · Referrals  (codes, tracking, tiers, leaderboard)
-- ══════════════════════════════════════════════════════════════

/* ─── Referral profiles (one per user) ─── */

create table public.referral_profiles (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references public.profiles(id) on delete cascade not null unique,
  referral_code   text unique not null,
  referred_by     uuid references public.profiles(id) on delete set null,
  tier            text not null default 'bronze' check (tier in ('bronze','silver','gold','diamond')),
  total_referrals integer not null default 0,
  total_earnings  numeric(12,2) not null default 0,
  created_at      timestamptz default now()
);

alter table public.referral_profiles enable row level security;
create policy "rp_select" on public.referral_profiles for select using (true);
create policy "rp_insert" on public.referral_profiles for insert with check (auth.uid() = user_id);
create policy "rp_update" on public.referral_profiles for update using (auth.uid() = user_id);

/* ─── Individual referrals (who referred whom) ─── */

create table public.referrals (
  id            uuid default gen_random_uuid() primary key,
  referrer_id   uuid references public.profiles(id) on delete cascade not null,
  referred_id   uuid references public.profiles(id) on delete cascade not null,
  status        text not null default 'pending' check (status in ('pending','active','inactive')),
  reward_amount numeric(12,2) not null default 0,
  created_at    timestamptz default now(),
  unique (referrer_id, referred_id)
);

alter table public.referrals enable row level security;
create policy "ref_select_referrer" on public.referrals for select using (auth.uid() = referrer_id);
create policy "ref_insert" on public.referrals for insert with check (auth.uid() = referred_id);

/* ─── Indexes ─── */

create index idx_rp_user         on public.referral_profiles(user_id);
create index idx_rp_code         on public.referral_profiles(referral_code);
create index idx_rp_referrals    on public.referral_profiles(total_referrals desc);
create index idx_ref_referrer    on public.referrals(referrer_id);
create index idx_ref_referred    on public.referrals(referred_id);

/* ─── Auto-create referral profile on user signup ─── */

create or replace function public.handle_new_referral_profile()
returns trigger language plpgsql security definer as $$
begin
  insert into public.referral_profiles (user_id, referral_code)
  values (
    new.id,
    upper(substr(md5(new.id::text || now()::text), 1, 8))
  );
  return new;
end;
$$;

create trigger on_profile_created_referral
  after insert on public.profiles
  for each row execute function public.handle_new_referral_profile();

/* ─── Trigger: update referral_profiles counts when referral status changes ─── */

create or replace function public.handle_referral_status_change()
returns trigger language plpgsql security definer as $$
declare
  v_count integer;
  v_earnings numeric(12,2);
  v_tier text;
begin
  -- Recalculate counts for the referrer
  select count(*), coalesce(sum(reward_amount), 0)
  into v_count, v_earnings
  from public.referrals
  where referrer_id = new.referrer_id
    and status = 'active';

  -- Determine tier (bronze 1-9, silver 10-49, gold 50-99, diamond 100+)
  if v_count >= 100 then v_tier := 'diamond';
  elsif v_count >= 50 then v_tier := 'gold';
  elsif v_count >= 10 then v_tier := 'silver';
  else v_tier := 'bronze';
  end if;

  update public.referral_profiles
  set total_referrals = v_count,
      total_earnings = v_earnings,
      tier = v_tier
  where user_id = new.referrer_id;

  return new;
end;
$$;

create trigger on_referral_change
  after insert or update on public.referrals
  for each row execute function public.handle_referral_status_change();

/* ══════════════════════════════════════════════════════════════
   SEED DATA
   ══════════════════════════════════════════════════════════════ */

DO $$
DECLARE
  v_users uuid[];
  v_u uuid;
  v_code text;
  i integer;
BEGIN
  -- Get existing profile IDs (from seed data)
  select array_agg(id) into v_users
  from public.profiles
  limit 10;

  if v_users is null or array_length(v_users, 1) is null then
    return;
  end if;

  for i in 1..array_length(v_users, 1) loop
    v_u := v_users[i];
    v_code := upper(substr(md5(v_u::text || i::text), 1, 8));

    insert into public.referral_profiles (user_id, referral_code, total_referrals, total_earnings, tier)
    values (
      v_u,
      v_code,
      case
        when i = 1 then 142
        when i = 2 then 89
        when i = 3 then 67
        when i = 4 then 52
        when i = 5 then 48
        when i = 6 then 45
        when i = 7 then 41
        when i = 8 then 38
        when i = 9 then 35
        else 31
      end,
      case
        when i = 1 then 1420.00
        when i = 2 then 890.00
        when i = 3 then 670.00
        when i = 4 then 520.00
        when i = 5 then 480.00
        when i = 6 then 450.00
        when i = 7 then 410.00
        when i = 8 then 380.00
        when i = 9 then 350.00
        else 310.00
      end,
      case
        when i = 1 then 'diamond'
        when i <= 3 then 'gold'
        when i <= 9 then 'silver'
        else 'bronze'
      end
    )
    on conflict (user_id) do update
    set total_referrals = excluded.total_referrals,
        total_earnings = excluded.total_earnings,
        tier = excluded.tier;
  end loop;
END $$;
