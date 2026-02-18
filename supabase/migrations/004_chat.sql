-- Chat rooms
create table public.chat_rooms (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('dm', 'group')),
  name text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Chat participants
create table public.chat_participants (
  room_id uuid references public.chat_rooms(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  last_read_at timestamptz default now(),
  primary key (room_id, user_id)
);

-- Messages
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.chat_rooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  type text default 'text' check (type in ('text', 'image')),
  created_at timestamptz default now()
);

-- Indexes
create index idx_messages_room on public.messages(room_id, created_at desc);
create index idx_chat_participants_user on public.chat_participants(user_id);

-- RLS
alter table public.chat_rooms enable row level security;
create policy "Users can view rooms they're in" on public.chat_rooms for select
  using (id in (select room_id from public.chat_participants where user_id = auth.uid()));
create policy "Users can create rooms" on public.chat_rooms for insert with check (auth.uid() = created_by);

alter table public.chat_participants enable row level security;
create policy "Participants can view participants in their rooms" on public.chat_participants for select
  using (room_id in (select room_id from public.chat_participants where user_id = auth.uid()));
create policy "Room creator can add participants" on public.chat_participants for insert
  with check (room_id in (select id from public.chat_rooms where created_by = auth.uid()) or user_id = auth.uid());

alter table public.messages enable row level security;
create policy "Users can view messages in their rooms" on public.messages for select
  using (room_id in (select room_id from public.chat_participants where user_id = auth.uid()));
create policy "Users can send messages to their rooms" on public.messages for insert
  with check (room_id in (select room_id from public.chat_participants where user_id = auth.uid()) and auth.uid() = user_id);

-- Enable Realtime
alter publication supabase_realtime add table public.messages;
