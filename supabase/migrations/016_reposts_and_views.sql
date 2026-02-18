-- Add repost_count and view_count to posts
alter table public.posts add column repost_count integer default 0;
alter table public.posts add column view_count integer default 0;

-- Reposts table
create table public.reposts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (user_id, post_id)
);

-- Indexes
create index idx_reposts_user on public.reposts(user_id);
create index idx_reposts_post on public.reposts(post_id);

-- RLS
alter table public.reposts enable row level security;
create policy "Reposts are viewable by everyone" on public.reposts for select using (true);
create policy "Users can repost" on public.reposts for insert with check (auth.uid() = user_id);
create policy "Users can unrepost" on public.reposts for delete using (auth.uid() = user_id);

-- Trigger for repost count
create or replace function public.handle_repost_change()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set repost_count = repost_count + 1 where id = NEW.post_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.posts set repost_count = greatest(0, repost_count - 1) where id = OLD.post_id;
    return OLD;
  end if;
end;
$$ language plpgsql security definer;

create trigger on_repost_change
  after insert or delete on public.reposts
  for each row execute procedure public.handle_repost_change();
