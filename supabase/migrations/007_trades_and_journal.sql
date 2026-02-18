-- Trades
create table public.trades (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  pair text not null,
  direction text not null check (direction in ('long', 'short')),
  entry_price numeric(20,8) not null,
  exit_price numeric(20,8),
  lot_size numeric(10,4) not null default 0.01,
  stop_loss numeric(20,8),
  take_profit numeric(20,8),
  pnl numeric(12,2),
  pnl_pips numeric(10,2),
  rr_ratio numeric(6,2),
  commission numeric(10,2) default 0,
  swap numeric(10,2) default 0,
  screenshot_url text,
  notes text check (char_length(notes) <= 2000),
  tags text[] default '{}',
  setup text,
  mistakes text[] default '{}',
  emotion text check (emotion in ('confident', 'neutral', 'fearful', 'greedy', 'revenge')),
  confidence integer check (confidence between 1 and 5),
  status text not null default 'open' check (status in ('open', 'closed', 'breakeven')),
  trade_date date not null default current_date,
  closed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_trades_user on public.trades(user_id);
create index idx_trades_date on public.trades(user_id, trade_date desc);
create index idx_trades_pair on public.trades(user_id, pair);
create index idx_trades_status on public.trades(status) where status = 'open';

-- RLS
alter table public.trades enable row level security;
create policy "Users can view own trades" on public.trades for select using (auth.uid() = user_id);
create policy "Users can create trades" on public.trades for insert with check (auth.uid() = user_id);
create policy "Users can update own trades" on public.trades for update using (auth.uid() = user_id);
create policy "Users can delete own trades" on public.trades for delete using (auth.uid() = user_id);

-- Updated at trigger (reuses existing handle_updated_at from migration 001)
create trigger trades_updated_at
  before update on public.trades
  for each row execute procedure public.handle_updated_at();

-- Trade count on profile (denormalized)
alter table public.profiles add column if not exists trade_count integer default 0;

create or replace function public.handle_trade_change()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.profiles set trade_count = trade_count + 1 where id = NEW.user_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.profiles set trade_count = greatest(0, trade_count - 1) where id = OLD.user_id;
    return OLD;
  end if;
end;
$$ language plpgsql security definer;

create trigger on_trade_change
  after insert or delete on public.trades
  for each row execute procedure public.handle_trade_change();
