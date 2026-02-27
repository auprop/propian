-- ============================================================
-- 053: User Mutes & Blocks
-- ============================================================

-- ─── user_mutes ────────────────────────────────────────────

create table public.user_mutes (
  user_id    uuid references public.profiles(id) on delete cascade not null,
  muted_id   uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (user_id, muted_id),
  check (user_id != muted_id)
);

create index idx_user_mutes_user on public.user_mutes(user_id);

alter table public.user_mutes enable row level security;

create policy "Users can view own mutes"
  on public.user_mutes for select
  using (auth.uid() = user_id);

create policy "Users can mute"
  on public.user_mutes for insert
  with check (auth.uid() = user_id);

create policy "Users can unmute"
  on public.user_mutes for delete
  using (auth.uid() = user_id);

-- ─── user_blocks ───────────────────────────────────────────

create table public.user_blocks (
  user_id     uuid references public.profiles(id) on delete cascade not null,
  blocked_id  uuid references public.profiles(id) on delete cascade not null,
  created_at  timestamptz default now(),
  primary key (user_id, blocked_id),
  check (user_id != blocked_id)
);

create index idx_user_blocks_user    on public.user_blocks(user_id);
create index idx_user_blocks_blocked on public.user_blocks(blocked_id);

alter table public.user_blocks enable row level security;

-- Users can see their own blocks
create policy "Users can view own blocks"
  on public.user_blocks for select
  using (auth.uid() = user_id);

-- Users can also see if someone blocked them (bidirectional check)
create policy "Users can see if they are blocked"
  on public.user_blocks for select
  using (auth.uid() = blocked_id);

create policy "Users can block"
  on public.user_blocks for insert
  with check (auth.uid() = user_id);

create policy "Users can unblock"
  on public.user_blocks for delete
  using (auth.uid() = user_id);

-- ─── Auto-unfollow on block ────────────────────────────────

create or replace function public.handle_block_insert()
returns trigger as $$
begin
  -- Remove follow relationship in both directions
  delete from public.follows
    where (follower_id = NEW.user_id and following_id = NEW.blocked_id)
       or (follower_id = NEW.blocked_id and following_id = NEW.user_id);
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_block_insert
  after insert on public.user_blocks
  for each row execute procedure public.handle_block_insert();
