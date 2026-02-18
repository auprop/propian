-- Notifications
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('mention', 'like', 'follow', 'comment', 'review', 'system')),
  title text not null,
  body text,
  data jsonb default '{}',
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Indexes
create index idx_notifications_user on public.notifications(user_id, created_at desc);
create index idx_notifications_unread on public.notifications(user_id) where is_read = false;

-- RLS
alter table public.notifications enable row level security;
create policy "Users can view own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id);

-- Enable Realtime
alter publication supabase_realtime add table public.notifications;
