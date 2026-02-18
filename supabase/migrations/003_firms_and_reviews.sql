-- Firms
create table public.firms (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  logo_url text,
  logo_text text,
  logo_color text,
  description text,
  website text,
  founded integer,
  profit_split text,
  max_drawdown text,
  daily_drawdown text,
  challenge_fee_min numeric,
  payout_cycle text,
  scaling_plan boolean default false,
  platforms text[] default '{}',
  rating_avg numeric(3,2) default 0,
  review_count integer default 0,
  pass_rate text,
  total_payouts text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Firm Reviews
create table public.firm_reviews (
  id uuid default gen_random_uuid() primary key,
  firm_id uuid references public.firms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rating integer not null check (rating between 1 and 5),
  title text not null check (char_length(title) <= 100),
  body text not null check (char_length(body) >= 50 and char_length(body) <= 2000),
  pros text[] default '{}',
  cons text[] default '{}',
  tags text[] default '{}',
  account_size text,
  time_to_pass text,
  profit_achieved text,
  helpful_count integer default 0,
  verified_purchase boolean default false,
  is_anonymous boolean default false,
  created_at timestamptz default now(),
  unique (firm_id, user_id)
);

-- Review votes
create table public.review_votes (
  user_id uuid references public.profiles(id) on delete cascade,
  review_id uuid references public.firm_reviews(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, review_id)
);

-- Indexes
create index idx_firms_slug on public.firms(slug);
create index idx_firms_rating on public.firms(rating_avg desc);
create index idx_firms_active on public.firms(is_active) where is_active = true;
create index idx_firm_reviews_firm on public.firm_reviews(firm_id);
create index idx_firm_reviews_rating on public.firm_reviews(rating desc);

-- RLS
alter table public.firms enable row level security;
create policy "Firms are viewable by everyone" on public.firms for select using (true);

alter table public.firm_reviews enable row level security;
create policy "Reviews are viewable by everyone" on public.firm_reviews for select using (true);
create policy "Users can create reviews" on public.firm_reviews for insert with check (auth.uid() = user_id);
create policy "Users can update own reviews" on public.firm_reviews for update using (auth.uid() = user_id);
create policy "Users can delete own reviews" on public.firm_reviews for delete using (auth.uid() = user_id);

alter table public.review_votes enable row level security;
create policy "Votes are viewable by everyone" on public.review_votes for select using (true);
create policy "Users can vote" on public.review_votes for insert with check (auth.uid() = user_id);
create policy "Users can remove vote" on public.review_votes for delete using (auth.uid() = user_id);

-- Triggers
create or replace function public.handle_review_change()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.firms set
      review_count = review_count + 1,
      rating_avg = (select avg(rating)::numeric(3,2) from public.firm_reviews where firm_id = NEW.firm_id)
    where id = NEW.firm_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.firms set
      review_count = greatest(0, review_count - 1),
      rating_avg = coalesce((select avg(rating)::numeric(3,2) from public.firm_reviews where firm_id = OLD.firm_id), 0)
    where id = OLD.firm_id;
    return OLD;
  elsif TG_OP = 'UPDATE' then
    update public.firms set
      rating_avg = (select avg(rating)::numeric(3,2) from public.firm_reviews where firm_id = NEW.firm_id)
    where id = NEW.firm_id;
    return NEW;
  end if;
end;
$$ language plpgsql security definer;

create trigger on_review_change
  after insert or update or delete on public.firm_reviews
  for each row execute procedure public.handle_review_change();

create or replace function public.handle_review_vote_change()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.firm_reviews set helpful_count = helpful_count + 1 where id = NEW.review_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.firm_reviews set helpful_count = greatest(0, helpful_count - 1) where id = OLD.review_id;
    return OLD;
  end if;
end;
$$ language plpgsql security definer;

create trigger on_review_vote_change
  after insert or delete on public.review_votes
  for each row execute procedure public.handle_review_vote_change();

create trigger firms_updated_at
  before update on public.firms
  for each row execute procedure public.handle_updated_at();
