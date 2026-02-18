-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  trading_style text check (trading_style in ('scalper', 'day-trader', 'swing', 'position')),
  experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced')),
  is_verified boolean default false,
  follower_count integer default 0,
  following_count integer default 0,
  post_count integer default 0,
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Follows
create table public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

-- Indexes
create index idx_profiles_username on public.profiles(username);
create index idx_follows_follower on public.follows(follower_id);
create index idx_follows_following on public.follows(following_id);

-- RLS
alter table public.profiles enable row level security;
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

alter table public.follows enable row level security;
create policy "Follows are viewable by everyone" on public.follows for select using (true);
create policy "Users can follow" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

-- Trigger: update follower/following counts
create or replace function public.handle_follow_change()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.profiles set follower_count = follower_count + 1 where id = NEW.following_id;
    update public.profiles set following_count = following_count + 1 where id = NEW.follower_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.profiles set follower_count = greatest(0, follower_count - 1) where id = OLD.following_id;
    update public.profiles set following_count = greatest(0, following_count - 1) where id = OLD.follower_id;
    return OLD;
  end if;
end;
$$ language plpgsql security definer;

create trigger on_follow_change
  after insert or delete on public.follows
  for each row execute procedure public.handle_follow_change();

-- Trigger: auto-create profile on auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'New Trader')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();
