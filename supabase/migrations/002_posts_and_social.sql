-- Posts
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null check (char_length(content) <= 1000),
  type text default 'text' check (type in ('text', 'image', 'poll')),
  media_urls text[] default '{}',
  sentiment_tag text check (sentiment_tag in ('bullish', 'bearish', 'neutral')),
  like_count integer default 0,
  comment_count integer default 0,
  share_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Comments
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null check (char_length(content) <= 500),
  parent_id uuid references public.comments(id) on delete cascade,
  like_count integer default 0,
  created_at timestamptz default now()
);

-- Likes (polymorphic)
create table public.likes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  target_id uuid not null,
  target_type text not null check (target_type in ('post', 'comment')),
  created_at timestamptz default now(),
  unique (user_id, target_id, target_type)
);

-- Bookmarks
create table public.bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (user_id, post_id)
);

-- Indexes
create index idx_posts_user_id on public.posts(user_id);
create index idx_posts_created_at on public.posts(created_at desc);
create index idx_comments_post_id on public.comments(post_id);
create index idx_comments_created_at on public.comments(created_at);
create index idx_likes_target on public.likes(target_id, target_type);
create index idx_likes_user on public.likes(user_id);
create index idx_bookmarks_user on public.bookmarks(user_id);

-- RLS
alter table public.posts enable row level security;
create policy "Posts are viewable by everyone" on public.posts for select using (true);
create policy "Users can create posts" on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can update own posts" on public.posts for update using (auth.uid() = user_id);
create policy "Users can delete own posts" on public.posts for delete using (auth.uid() = user_id);

alter table public.comments enable row level security;
create policy "Comments are viewable by everyone" on public.comments for select using (true);
create policy "Users can create comments" on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can delete own comments" on public.comments for delete using (auth.uid() = user_id);

alter table public.likes enable row level security;
create policy "Likes are viewable by everyone" on public.likes for select using (true);
create policy "Users can like" on public.likes for insert with check (auth.uid() = user_id);
create policy "Users can unlike" on public.likes for delete using (auth.uid() = user_id);

alter table public.bookmarks enable row level security;
create policy "Users can view own bookmarks" on public.bookmarks for select using (auth.uid() = user_id);
create policy "Users can bookmark" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "Users can remove bookmark" on public.bookmarks for delete using (auth.uid() = user_id);

-- Triggers for count updates
create or replace function public.handle_like_change()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.target_type = 'post' then
      update public.posts set like_count = like_count + 1 where id = NEW.target_id;
    elsif NEW.target_type = 'comment' then
      update public.comments set like_count = like_count + 1 where id = NEW.target_id;
    end if;
    return NEW;
  elsif TG_OP = 'DELETE' then
    if OLD.target_type = 'post' then
      update public.posts set like_count = greatest(0, like_count - 1) where id = OLD.target_id;
    elsif OLD.target_type = 'comment' then
      update public.comments set like_count = greatest(0, like_count - 1) where id = OLD.target_id;
    end if;
    return OLD;
  end if;
end;
$$ language plpgsql security definer;

create trigger on_like_change
  after insert or delete on public.likes
  for each row execute procedure public.handle_like_change();

create or replace function public.handle_comment_change()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = NEW.post_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.posts set comment_count = greatest(0, comment_count - 1) where id = OLD.post_id;
    return OLD;
  end if;
end;
$$ language plpgsql security definer;

create trigger on_comment_change
  after insert or delete on public.comments
  for each row execute procedure public.handle_comment_change();

create or replace function public.handle_post_change()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.profiles set post_count = post_count + 1 where id = NEW.user_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.profiles set post_count = greatest(0, post_count - 1) where id = OLD.user_id;
    return OLD;
  end if;
end;
$$ language plpgsql security definer;

create trigger on_post_change
  after insert or delete on public.posts
  for each row execute procedure public.handle_post_change();

create trigger posts_updated_at
  before update on public.posts
  for each row execute procedure public.handle_updated_at();

-- Enable Realtime
alter publication supabase_realtime add table public.posts;
