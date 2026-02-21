-- ============================================================
-- 026 — Enhanced Chat: Communities, Channels, Reactions, Knowledge Library
-- ============================================================

-- ─── COMMUNITIES (Discord-like servers) ───

create table public.communities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  description text,
  icon_url text,
  banner_url text,
  owner_id uuid references public.profiles(id) on delete set null,
  settings jsonb default '{}',
  created_at timestamptz default now()
);

-- ─── COMMUNITY CATEGORIES (channel groupings) ───

create table public.community_categories (
  id uuid default gen_random_uuid() primary key,
  community_id uuid references public.communities(id) on delete cascade not null,
  name text not null,
  position int default 0,
  created_at timestamptz default now()
);

-- ─── COMMUNITY ROLES ───

create table public.community_roles (
  id uuid default gen_random_uuid() primary key,
  community_id uuid references public.communities(id) on delete cascade not null,
  name text not null,
  color text,
  permissions jsonb default '{}',
  position int default 0,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- ─── COMMUNITY MEMBERS ───

create table public.community_members (
  id uuid default gen_random_uuid() primary key,
  community_id uuid references public.communities(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role_id uuid references public.community_roles(id) on delete set null,
  joined_at timestamptz default now(),
  nickname text,
  unique (community_id, user_id)
);

-- ─── KNOWLEDGE PINS (community library) ───

create table public.knowledge_pins (
  id uuid default gen_random_uuid() primary key,
  community_id uuid references public.communities(id) on delete cascade not null,
  channel_id uuid references public.chat_rooms(id) on delete cascade not null,
  message_id uuid references public.messages(id) on delete cascade not null,
  pinned_by uuid references public.profiles(id) on delete set null,
  category text,
  tags text[],
  created_at timestamptz default now()
);

-- ─── MESSAGE REACTIONS ───

create table public.message_reactions (
  id uuid default gen_random_uuid() primary key,
  message_id uuid references public.messages(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  emoji text not null,
  created_at timestamptz default now(),
  unique (message_id, user_id, emoji)
);

-- ─── CHANNEL READ STATE (unread tracking) ───

create table public.channel_read_state (
  user_id uuid references public.profiles(id) on delete cascade not null,
  channel_id uuid references public.chat_rooms(id) on delete cascade not null,
  last_read_message_id uuid references public.messages(id) on delete set null,
  last_read_at timestamptz default now(),
  mention_count int default 0,
  primary key (user_id, channel_id)
);


-- ============================================================
-- ALTER EXISTING TABLES
-- ============================================================

-- ─── chat_rooms: add community/channel columns ───

alter table public.chat_rooms
  add column community_id uuid references public.communities(id) on delete cascade,
  add column category_id uuid references public.community_categories(id) on delete set null,
  add column channel_type text check (channel_type in ('discussion', 'setups', 'signals', 'resources', 'qa')),
  add column position int default 0,
  add column permissions_override jsonb;

-- ─── messages: add structured fields ───

alter table public.messages
  add column ticker_mentions text[],
  add column is_pinned_to_library boolean default false,
  add column structured_data jsonb;


-- ============================================================
-- INDEXES
-- ============================================================

-- messages: already has idx_messages_room (room_id, created_at desc)
-- GIN index for ticker-based queries
create index idx_messages_ticker_mentions on public.messages using gin (ticker_mentions);

-- community members lookup
create index idx_community_members_user on public.community_members(user_id);

-- knowledge pins browsing
create index idx_knowledge_pins_community_cat on public.knowledge_pins(community_id, category);

-- message reactions lookup
create index idx_message_reactions_message on public.message_reactions(message_id);

-- chat rooms by community
create index idx_chat_rooms_community on public.chat_rooms(community_id, position);


-- ============================================================
-- RLS POLICIES
-- ============================================================

-- ─── Communities ───
alter table public.communities enable row level security;

create policy "Anyone can view communities"
  on public.communities for select using (true);

create policy "Authenticated users can create communities"
  on public.communities for insert with check (auth.uid() = owner_id);

create policy "Owner can update community"
  on public.communities for update using (auth.uid() = owner_id);

create policy "Owner can delete community"
  on public.communities for delete using (auth.uid() = owner_id);

-- ─── Community Categories ───
alter table public.community_categories enable row level security;

create policy "Members can view categories"
  on public.community_categories for select
  using (community_id in (
    select community_id from public.community_members where user_id = auth.uid()
  ));

create policy "Owner/admin can manage categories"
  on public.community_categories for all
  using (community_id in (
    select id from public.communities where owner_id = auth.uid()
  ));

-- ─── Community Roles ───
alter table public.community_roles enable row level security;

create policy "Members can view roles"
  on public.community_roles for select
  using (community_id in (
    select community_id from public.community_members where user_id = auth.uid()
  ));

create policy "Owner can manage roles"
  on public.community_roles for all
  using (community_id in (
    select id from public.communities where owner_id = auth.uid()
  ));

-- ─── Community Members ───
alter table public.community_members enable row level security;

create policy "Members can view other members"
  on public.community_members for select
  using (community_id in (
    select community_id from public.community_members where user_id = auth.uid()
  ));

create policy "Users can join communities"
  on public.community_members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave communities"
  on public.community_members for delete
  using (auth.uid() = user_id);

create policy "Owner can manage members"
  on public.community_members for all
  using (community_id in (
    select id from public.communities where owner_id = auth.uid()
  ));

-- ─── Knowledge Pins ───
alter table public.knowledge_pins enable row level security;

create policy "Members can view pins"
  on public.knowledge_pins for select
  using (community_id in (
    select community_id from public.community_members where user_id = auth.uid()
  ));

create policy "Members can create pins"
  on public.knowledge_pins for insert
  with check (
    auth.uid() = pinned_by
    and community_id in (
      select community_id from public.community_members where user_id = auth.uid()
    )
  );

create policy "Pin creator or owner can delete pins"
  on public.knowledge_pins for delete
  using (
    auth.uid() = pinned_by
    or community_id in (
      select id from public.communities where owner_id = auth.uid()
    )
  );

-- ─── Message Reactions ───
alter table public.message_reactions enable row level security;

create policy "Users can view reactions in their rooms"
  on public.message_reactions for select
  using (message_id in (
    select m.id from public.messages m
    join public.chat_participants cp on cp.room_id = m.room_id
    where cp.user_id = auth.uid()
  ));

create policy "Users can add reactions"
  on public.message_reactions for insert
  with check (
    auth.uid() = user_id
    and message_id in (
      select m.id from public.messages m
      join public.chat_participants cp on cp.room_id = m.room_id
      where cp.user_id = auth.uid()
    )
  );

create policy "Users can remove their own reactions"
  on public.message_reactions for delete
  using (auth.uid() = user_id);

-- ─── Channel Read State ───
alter table public.channel_read_state enable row level security;

create policy "Users can view their own read state"
  on public.channel_read_state for select
  using (auth.uid() = user_id);

create policy "Users can upsert their own read state"
  on public.channel_read_state for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own read state"
  on public.channel_read_state for update
  using (auth.uid() = user_id);


-- ============================================================
-- ENABLE REALTIME
-- ============================================================

alter publication supabase_realtime add table public.message_reactions;
alter publication supabase_realtime add table public.channel_read_state;


-- ============================================================
-- HELPER: find_dm_room RPC (if not already exists)
-- ============================================================

create or replace function public.find_dm_room(target_user_id uuid)
returns uuid
language sql
stable
security definer
as $$
  select cr.id
  from public.chat_rooms cr
  join public.chat_participants cp1 on cp1.room_id = cr.id and cp1.user_id = auth.uid()
  join public.chat_participants cp2 on cp2.room_id = cr.id and cp2.user_id = target_user_id
  where cr.type = 'dm'
    and cr.community_id is null
  limit 1;
$$;
