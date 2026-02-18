-- ══════════════════════════════════════════════════════════════
--  013 · Academy  (courses, lessons, quizzes, progress, certs)
-- ══════════════════════════════════════════════════════════════

/* ─── Content tables (public read) ─── */

create table public.instructors (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  handle      text unique not null,
  avatar_text text not null,
  avatar_color text not null,
  role        text not null,
  bio         text,
  location    text,
  joined_date date default now(),
  specialization text,
  is_verified boolean default false,
  created_at  timestamptz default now()
);

alter table public.instructors enable row level security;
create policy "instructors_select" on public.instructors for select using (true);

-- ──────────────────────────────────────

create table public.courses (
  id              uuid default gen_random_uuid() primary key,
  title           text not null,
  slug            text unique not null,
  description     text not null,
  level           text not null check (level in ('beginner','intermediate','advanced')),
  lessons_count   integer not null default 0,
  duration_text   text not null,
  students_count  integer not null default 0,
  price           text not null default 'Free',
  thumbnail_color text not null,
  instructor_id   uuid references public.instructors(id) on delete set null,
  created_at      timestamptz default now()
);

alter table public.courses enable row level security;
create policy "courses_select" on public.courses for select using (true);

-- ──────────────────────────────────────

create table public.course_modules (
  id         uuid default gen_random_uuid() primary key,
  course_id  uuid references public.courses(id) on delete cascade not null,
  title      text not null,
  sort_order integer not null default 0
);

alter table public.course_modules enable row level security;
create policy "course_modules_select" on public.course_modules for select using (true);

-- ──────────────────────────────────────

create table public.lessons (
  id            uuid default gen_random_uuid() primary key,
  module_id     uuid references public.course_modules(id) on delete cascade not null,
  course_id     uuid references public.courses(id) on delete cascade not null,
  title         text not null,
  type          text not null check (type in ('video','article','quiz')),
  duration_text text not null default '5m',
  sort_order    integer not null default 0,
  video_url     text,
  content       text
);

alter table public.lessons enable row level security;
create policy "lessons_select" on public.lessons for select using (true);

-- ──────────────────────────────────────

create table public.quiz_questions (
  id            uuid default gen_random_uuid() primary key,
  lesson_id     uuid references public.lessons(id) on delete cascade not null,
  question      text not null,
  options       text[] not null,
  correct_index integer not null,
  explanation   text
);

alter table public.quiz_questions enable row level security;
create policy "quiz_questions_select" on public.quiz_questions for select using (true);

-- ──────────────────────────────────────

create table public.learning_paths (
  id          uuid default gen_random_uuid() primary key,
  title       text not null,
  description text
);

alter table public.learning_paths enable row level security;
create policy "learning_paths_select" on public.learning_paths for select using (true);

-- ──────────────────────────────────────

create table public.learning_path_courses (
  path_id    uuid references public.learning_paths(id) on delete cascade,
  course_id  uuid references public.courses(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (path_id, course_id)
);

alter table public.learning_path_courses enable row level security;
create policy "learning_path_courses_select" on public.learning_path_courses for select using (true);

/* ─── Per-user tables (auth-gated) ─── */

create table public.user_course_progress (
  user_id           uuid references public.profiles(id) on delete cascade,
  course_id         uuid references public.courses(id) on delete cascade,
  enrolled_at       timestamptz default now(),
  completed_at      timestamptz,
  progress_pct      integer default 0 check (progress_pct between 0 and 100),
  current_lesson_id uuid references public.lessons(id),
  primary key (user_id, course_id)
);

alter table public.user_course_progress enable row level security;
create policy "ucp_select" on public.user_course_progress for select using (auth.uid() = user_id);
create policy "ucp_insert" on public.user_course_progress for insert with check (auth.uid() = user_id);
create policy "ucp_update" on public.user_course_progress for update using (auth.uid() = user_id);

-- ──────────────────────────────────────

create table public.user_lesson_progress (
  user_id      uuid references public.profiles(id) on delete cascade,
  lesson_id    uuid references public.lessons(id) on delete cascade,
  completed    boolean default false,
  completed_at timestamptz,
  primary key (user_id, lesson_id)
);

alter table public.user_lesson_progress enable row level security;
create policy "ulp_select" on public.user_lesson_progress for select using (auth.uid() = user_id);
create policy "ulp_insert" on public.user_lesson_progress for insert with check (auth.uid() = user_id);
create policy "ulp_update" on public.user_lesson_progress for update using (auth.uid() = user_id);

-- ──────────────────────────────────────

create table public.user_quiz_attempts (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  lesson_id    uuid references public.lessons(id) on delete cascade not null,
  score        integer not null check (score between 0 and 100),
  passed       boolean not null,
  answers      integer[] not null,
  attempted_at timestamptz default now()
);

alter table public.user_quiz_attempts enable row level security;
create policy "uqa_select" on public.user_quiz_attempts for select using (auth.uid() = user_id);
create policy "uqa_insert" on public.user_quiz_attempts for insert with check (auth.uid() = user_id);

-- ──────────────────────────────────────

create table public.user_notes (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  lesson_id  uuid references public.lessons(id) on delete cascade not null,
  content    text not null default '',
  updated_at timestamptz default now(),
  unique (user_id, lesson_id)
);

alter table public.user_notes enable row level security;
create policy "un_select" on public.user_notes for select using (auth.uid() = user_id);
create policy "un_insert" on public.user_notes for insert with check (auth.uid() = user_id);
create policy "un_update" on public.user_notes for update using (auth.uid() = user_id);
create policy "un_delete" on public.user_notes for delete using (auth.uid() = user_id);

-- updated_at trigger (reuse handle_updated_at from migration 001)
create trigger set_user_notes_updated_at
  before update on public.user_notes
  for each row execute function public.handle_updated_at();

-- ──────────────────────────────────────

create table public.certificates (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references public.profiles(id) on delete cascade not null,
  course_id        uuid references public.courses(id) on delete cascade not null,
  certificate_code text unique not null,
  issued_at        timestamptz default now(),
  unique (user_id, course_id)
);

alter table public.certificates enable row level security;
create policy "cert_select" on public.certificates for select using (true);
create policy "cert_insert" on public.certificates for insert with check (auth.uid() = user_id);

-- ──────────────────────────────────────

create table public.instructor_reviews (
  id            uuid default gen_random_uuid() primary key,
  instructor_id uuid references public.instructors(id) on delete cascade not null,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  rating        integer not null check (rating between 1 and 5),
  body          text,
  created_at    timestamptz default now(),
  unique (instructor_id, user_id)
);

alter table public.instructor_reviews enable row level security;
create policy "ir_select" on public.instructor_reviews for select using (true);
create policy "ir_insert" on public.instructor_reviews for insert with check (auth.uid() = user_id);
create policy "ir_update" on public.instructor_reviews for update using (auth.uid() = user_id);
create policy "ir_delete" on public.instructor_reviews for delete using (auth.uid() = user_id);

/* ─── Indexes ─── */

create index idx_courses_instructor  on public.courses(instructor_id);
create index idx_courses_slug        on public.courses(slug);
create index idx_lessons_module      on public.lessons(module_id);
create index idx_lessons_course      on public.lessons(course_id);
create index idx_quiz_questions_lesson on public.quiz_questions(lesson_id);
create index idx_ucp_user            on public.user_course_progress(user_id);
create index idx_ulp_user            on public.user_lesson_progress(user_id);
create index idx_uqa_user_lesson     on public.user_quiz_attempts(user_id, lesson_id);
create index idx_un_user_lesson      on public.user_notes(user_id, lesson_id);
create index idx_cert_user           on public.certificates(user_id);
create index idx_ir_instructor       on public.instructor_reviews(instructor_id);

/* ══════════════════════════════════════════════════════════════
   SEED DATA
   ══════════════════════════════════════════════════════════════ */

DO $$
DECLARE
  -- Instructor IDs
  v_mc uuid;
  v_sk uuid;
  v_ar uuid;
  v_jl uuid;
  v_ew uuid;
  -- Course IDs
  v_c1 uuid;
  v_c2 uuid;
  v_c3 uuid;
  v_c4 uuid;
  v_c5 uuid;
  v_c6 uuid;
  -- Module IDs
  v_m  uuid;
  -- Lesson IDs (for quiz lessons)
  v_l  uuid;
  -- Learning path IDs
  v_p1 uuid;
  v_p2 uuid;
BEGIN

  /* ─── Instructors ─── */

  insert into public.instructors (id, name, handle, avatar_text, avatar_color, role, bio, location, joined_date, specialization, is_verified)
  values (gen_random_uuid(), 'Marcus Chen', 'marcuschen', 'MC', '#2962ff',
    'Senior Prop Trader',
    'Former institutional trader with 12+ years of experience in forex and indices. Founded the Propian Academy to help aspiring prop traders develop consistent, risk-managed strategies.',
    'New York, US', '2022-03-15', 'Forex & Indices', true)
  returning id into v_mc;

  insert into public.instructors (id, name, handle, avatar_text, avatar_color, role, bio, location, joined_date, specialization, is_verified)
  values (gen_random_uuid(), 'Sarah Kim', 'sarahkim', 'SK', '#ffd700',
    'Gold & Metals Specialist',
    'Specialist in precious metals trading with a focus on XAUUSD. 8 years of experience at top commodity trading firms before transitioning to education.',
    'London, UK', '2022-08-01', 'Commodities & Metals', false)
  returning id into v_sk;

  insert into public.instructors (id, name, handle, avatar_text, avatar_color, role, bio, location, joined_date, specialization, is_verified)
  values (gen_random_uuid(), 'Alex Rivera', 'alexrivera', 'AR', '#22c55e',
    'Risk Analyst',
    'Quantitative risk analyst who has managed risk for funds exceeding $500M. Passionate about teaching proper position sizing and risk frameworks.',
    'Chicago, US', '2023-01-10', 'Risk Management', false)
  returning id into v_ar;

  insert into public.instructors (id, name, handle, avatar_text, avatar_color, role, bio, location, joined_date, specialization, is_verified)
  values (gen_random_uuid(), 'Jordan Lee', 'jordanlee', 'JL', '#8b5cf6',
    'Crypto Analyst',
    'Early Bitcoin adopter and crypto market analyst. Specializes in on-chain analysis and DeFi trading strategies for prop traders.',
    'Singapore', '2023-04-20', 'Crypto & DeFi', false)
  returning id into v_jl;

  insert into public.instructors (id, name, handle, avatar_text, avatar_color, role, bio, location, joined_date, specialization, is_verified)
  values (gen_random_uuid(), 'Dr. Emma Walsh', 'emmawalsh', 'EW', '#ec4899',
    'Trading Psychologist',
    'PhD in behavioral economics with a specialization in trader psychology. Has coached over 2,000 traders on mental resilience and discipline.',
    'Sydney, AU', '2023-06-15', 'Trading Psychology', false)
  returning id into v_ew;

  /* ─── Courses ─── */

  insert into public.courses (id, title, slug, description, level, lessons_count, duration_text, students_count, price, thumbnail_color, instructor_id)
  values (gen_random_uuid(), 'Prop Trading Fundamentals', 'prop-trading-fundamentals',
    'Master the foundations of proprietary trading. Learn about prop firm rules, risk management basics, and how to build a consistent trading plan that passes evaluations.',
    'beginner', 12, '4.5h', 2841, 'Free', '#2962ff', v_mc)
  returning id into v_c1;

  insert into public.courses (id, title, slug, description, level, lessons_count, duration_text, students_count, price, thumbnail_color, instructor_id)
  values (gen_random_uuid(), 'Advanced Gold Trading', 'advanced-gold-trading',
    'Deep dive into XAUUSD trading strategies. Covers fundamental analysis, seasonal patterns, central bank impacts, and advanced technical setups specific to gold.',
    'advanced', 18, '7.2h', 1204, '$49', '#ffd700', v_sk)
  returning id into v_c2;

  insert into public.courses (id, title, slug, description, level, lessons_count, duration_text, students_count, price, thumbnail_color, instructor_id)
  values (gen_random_uuid(), 'Risk Management Mastery', 'risk-management-mastery',
    'Learn professional risk management frameworks used by institutional traders. Position sizing, portfolio heat, drawdown management, and recovery strategies.',
    'intermediate', 15, '5.8h', 3102, '$39', '#22c55e', v_ar)
  returning id into v_c3;

  insert into public.courses (id, title, slug, description, level, lessons_count, duration_text, students_count, price, thumbnail_color, instructor_id)
  values (gen_random_uuid(), 'Crypto Market Analysis', 'crypto-market-analysis',
    'Understand crypto market structure, on-chain metrics, and DeFi protocols. Learn to identify high-probability setups in Bitcoin, Ethereum, and altcoin markets.',
    'intermediate', 10, '3.5h', 1892, '$29', '#8b5cf6', v_jl)
  returning id into v_c4;

  insert into public.courses (id, title, slug, description, level, lessons_count, duration_text, students_count, price, thumbnail_color, instructor_id)
  values (gen_random_uuid(), 'Psychology of Trading', 'psychology-of-trading',
    'Build mental resilience and emotional discipline. Learn to manage fear, greed, and FOMO while developing the psychological edge that separates profitable traders.',
    'beginner', 8, '2.8h', 4521, 'Free', '#ec4899', v_ew)
  returning id into v_c5;

  insert into public.courses (id, title, slug, description, level, lessons_count, duration_text, students_count, price, thumbnail_color, instructor_id)
  values (gen_random_uuid(), 'Algorithmic Trading Basics', 'algorithmic-trading-basics',
    'Introduction to systematic trading. Build simple algorithms, backtest strategies, and understand the fundamentals of automated execution for prop trading.',
    'advanced', 22, '9.5h', 987, '$69', '#f97316', v_mc)
  returning id into v_c6;

  /* ─── Course 1: Prop Trading Fundamentals — Modules & Lessons ─── */

  -- Module 1
  insert into public.course_modules (id, course_id, title, sort_order)
  values (gen_random_uuid(), v_c1, 'Introduction to Prop Trading', 0)
  returning id into v_m;

  insert into public.lessons (module_id, course_id, title, type, duration_text, sort_order)
  values
    (v_m, v_c1, 'What is Proprietary Trading?', 'video', '12m', 0),
    (v_m, v_c1, 'How Prop Firms Work', 'video', '15m', 1),
    (v_m, v_c1, 'Understanding Evaluation Rules', 'article', '10m', 2),
    (v_m, v_c1, 'Choosing the Right Prop Firm', 'video', '18m', 3);

  -- Module 2
  insert into public.course_modules (id, course_id, title, sort_order)
  values (gen_random_uuid(), v_c1, 'Building Your Trading Plan', 1)
  returning id into v_m;

  insert into public.lessons (module_id, course_id, title, type, duration_text, sort_order)
  values
    (v_m, v_c1, 'Setting Clear Trading Goals', 'video', '14m', 0),
    (v_m, v_c1, 'Defining Your Trading Edge', 'video', '20m', 1),
    (v_m, v_c1, 'Creating Entry & Exit Rules', 'article', '15m', 2),
    (v_m, v_c1, 'Backtesting Your Strategy', 'video', '22m', 3);

  -- Module 3
  insert into public.course_modules (id, course_id, title, sort_order)
  values (gen_random_uuid(), v_c1, 'Risk Management Basics', 2)
  returning id into v_m;

  insert into public.lessons (id, module_id, course_id, title, type, duration_text, sort_order)
  values (gen_random_uuid(), v_m, v_c1, 'Position Sizing 101', 'video', '16m', 0)
  returning id into v_l;

  insert into public.lessons (module_id, course_id, title, type, duration_text, sort_order)
  values
    (v_m, v_c1, 'Daily Loss Limits & Drawdown', 'video', '18m', 1),
    (v_m, v_c1, 'Risk-Reward Ratios', 'article', '12m', 2);

  -- Quiz for Course 1
  insert into public.lessons (id, module_id, course_id, title, type, duration_text, sort_order)
  values (gen_random_uuid(), v_m, v_c1, 'Module 3 Quiz', 'quiz', '10m', 3)
  returning id into v_l;

  insert into public.quiz_questions (lesson_id, question, options, correct_index, explanation) values
    (v_l, 'What is the recommended maximum risk per trade for prop trading?', ARRAY['10% of account','5% of account','1-2% of account','No limit'], 2,
     'Most prop firms recommend risking 1-2% of your account per trade to ensure longevity and pass evaluations.'),
    (v_l, 'What is a daily loss limit?', ARRAY['The maximum profit target per day','The maximum amount you can lose in a single trading day','The number of trades allowed per day','The spread cost per day'], 1,
     'A daily loss limit caps the maximum loss allowed in a single trading session, typically set by the prop firm.'),
    (v_l, 'A risk-reward ratio of 1:3 means:', ARRAY['You risk $3 to make $1','You risk $1 to make $3','You win 3 out of every trade','Your account grows 3x'], 1,
     'A 1:3 risk-reward means for every $1 risked, the potential profit is $3.'),
    (v_l, 'What happens if you breach the maximum drawdown on a prop firm account?', ARRAY['You get a warning','Your account is suspended or terminated','Nothing happens','You pay a fee'], 1,
     'Breaching the maximum drawdown typically results in account termination. This is why risk management is crucial.'),
    (v_l, 'Which of these is NOT a common prop firm rule?', ARRAY['Daily loss limit','Maximum drawdown','Profit target','Minimum 50 trades per day'], 3,
     'While most firms have daily loss limits, max drawdown, and profit targets, requiring a minimum number of trades per day is not standard.');

  /* ─── Course 2: Advanced Gold Trading — Modules & Lessons ─── */

  -- Module 1
  insert into public.course_modules (id, course_id, title, sort_order)
  values (gen_random_uuid(), v_c2, 'Gold Market Fundamentals', 0)
  returning id into v_m;

  insert into public.lessons (module_id, course_id, title, type, duration_text, sort_order)
  values
    (v_m, v_c2, 'Gold as a Financial Instrument', 'video', '15m', 0),
    (v_m, v_c2, 'Key Drivers of Gold Prices', 'video', '20m', 1),
    (v_m, v_c2, 'Central Bank Gold Policies', 'article', '18m', 2),
    (v_m, v_c2, 'Gold Correlations: DXY, Yields, SPX', 'video', '22m', 3),
    (v_m, v_c2, 'Seasonal Gold Patterns', 'video', '14m', 4);

  -- Module 2
  insert into public.course_modules (id, course_id, title, sort_order)
  values (gen_random_uuid(), v_c2, 'Technical Analysis for Gold', 1)
  returning id into v_m;

  insert into public.lessons (module_id, course_id, title, type, duration_text, sort_order)
  values
    (v_m, v_c2, 'Key Support & Resistance Zones', 'video', '25m', 0),
    (v_m, v_c2, 'Fibonacci Retracements in Gold', 'video', '20m', 1),
    (v_m, v_c2, 'Volume Profile Analysis', 'article', '16m', 2),
    (v_m, v_c2, 'Multi-Timeframe Gold Analysis', 'video', '28m', 3);

  -- Module 3
  insert into public.course_modules (id, course_id, title, sort_order)
  values (gen_random_uuid(), v_c2, 'Advanced Gold Strategies', 2)
  returning id into v_m;

  insert into public.lessons (module_id, course_id, title, type, duration_text, sort_order)
  values
    (v_m, v_c2, 'London Session Gold Scalping', 'video', '30m', 0),
    (v_m, v_c2, 'News Trading: NFP & CPI', 'video', '25m', 1),
    (v_m, v_c2, 'Gold Swing Trading Setups', 'article', '20m', 2),
    (v_m, v_c2, 'Managing Gold Volatility', 'video', '18m', 3);

  -- Quiz for Course 2
  insert into public.lessons (id, module_id, course_id, title, type, duration_text, sort_order)
  values (gen_random_uuid(), v_m, v_c2, 'Gold Trading Quiz', 'quiz', '15m', 4)
  returning id into v_l;

  insert into public.quiz_questions (lesson_id, question, options, correct_index, explanation) values
    (v_l, 'Which central bank holds the largest gold reserves?', ARRAY['European Central Bank','Bank of Japan','Federal Reserve (US)','Bank of China'], 2,
     'The United States holds the largest official gold reserves at over 8,100 tonnes, stored primarily at Fort Knox and the NY Fed.'),
    (v_l, 'When the US Dollar strengthens, gold typically:', ARRAY['Rises','Falls','Stays the same','Becomes more volatile'], 1,
     'Gold has an inverse correlation with the US Dollar. A stronger dollar makes gold more expensive in other currencies, reducing demand.'),
    (v_l, 'What is the best session for gold scalping?', ARRAY['Asian session','London session','New York close','Weekend gaps'], 1,
     'The London session sees the highest gold volume and volatility, making it ideal for scalping strategies.'),
    (v_l, 'Gold''s ticker symbol on most platforms is:', ARRAY['GOLD','GLD','XAUUSD','AU'], 2,
     'XAUUSD is the standard forex ticker for gold priced in US dollars. XAU is the ISO 4217 currency code for gold.');

  /* ─── Course 3: Risk Management Mastery — Modules & Lessons ─── */

  insert into public.course_modules (id, course_id, title, sort_order)
  values (gen_random_uuid(), v_c3, 'Foundations of Risk', 0)
  returning id into v_m;

  insert into public.lessons (module_id, course_id, title, type, duration_text, sort_order)
  values
    (v_m, v_c3, 'Understanding Risk vs Reward', 'video', '14m', 0),
    (v_m, v_c3, 'Types of Trading Risk', 'video', '18m', 1),
    (v_m, v_c3, 'Building a Risk Framework', 'article', '16m', 2);

  insert into public.course_modules (id, course_id, title, sort_order)
  values (gen_random_uuid(), v_c3, 'Position Sizing Strategies', 1)
  returning id into v_m;

  insert into public.lessons (module_id, course_id, title, type, duration_text, sort_order)
  values
    (v_m, v_c3, 'Fixed Fractional Sizing', 'video', '20m', 0),
    (v_m, v_c3, 'Kelly Criterion for Traders', 'video', '22m', 1),
    (v_m, v_c3, 'Scaling In and Out', 'article', '15m', 2);

  -- Quiz for Course 3
  insert into public.lessons (id, module_id, course_id, title, type, duration_text, sort_order)
  values (gen_random_uuid(), v_m, v_c3, 'Risk Management Quiz', 'quiz', '10m', 3)
  returning id into v_l;

  insert into public.quiz_questions (lesson_id, question, options, correct_index, explanation) values
    (v_l, 'The Kelly Criterion helps determine:', ARRAY['The best time to enter a trade','Optimal position size based on edge','Which currency pair to trade','When to exit a trade'], 1,
     'The Kelly Criterion calculates the optimal bet size based on your win rate and risk-reward ratio to maximize long-term growth.'),
    (v_l, 'What is "portfolio heat"?', ARRAY['The temperature of the server room','Total risk exposure across all open positions','The speed of trade execution','Market volatility index'], 1,
     'Portfolio heat measures the total percentage of your account at risk across all open positions simultaneously.'),
    (v_l, 'After a losing streak, you should:', ARRAY['Double your position size to recover','Reduce position size and reassess','Stop trading permanently','Switch to a different market'], 1,
     'Reducing position size after losses protects capital and gives you time to reassess your strategy without emotional pressure.');

  /* ─── Course 4: Crypto Market Analysis — Modules & Lessons ─── */

  insert into public.course_modules (id, course_id, title, sort_order)
  values (gen_random_uuid(), v_c4, 'Crypto Market Structure', 0)
  returning id into v_m;

  insert into public.lessons (module_id, course_id, title, type, duration_text, sort_order)
  values
    (v_m, v_c4, 'Understanding Crypto Markets', 'video', '16m', 0),
    (v_m, v_c4, 'On-Chain Analysis Basics', 'video', '22m', 1),
    (v_m, v_c4, 'DeFi Trading Fundamentals', 'article', '18m', 2);

  insert into public.course_modules (id, course_id, title, sort_order)
  values (gen_random_uuid(), v_c4, 'Crypto Trading Strategies', 1)
  returning id into v_m;

  insert into public.lessons (module_id, course_id, title, type, duration_text, sort_order)
  values
    (v_m, v_c4, 'Bitcoin Market Cycles', 'video', '20m', 0),
    (v_m, v_c4, 'Altcoin Rotation Strategy', 'video', '18m', 1);

  -- Quiz for Course 4
  insert into public.lessons (id, module_id, course_id, title, type, duration_text, sort_order)
  values (gen_random_uuid(), v_m, v_c4, 'Crypto Analysis Quiz', 'quiz', '10m', 2)
  returning id into v_l;

  insert into public.quiz_questions (lesson_id, question, options, correct_index, explanation) values
    (v_l, 'What does "on-chain analysis" examine?', ARRAY['Social media sentiment','Blockchain transaction data','Exchange order books','News headlines'], 1,
     'On-chain analysis looks at blockchain transaction data including wallet movements, exchange flows, and network activity.'),
    (v_l, 'Bitcoin halving events occur approximately every:', ARRAY['1 year','2 years','4 years','10 years'], 2,
     'Bitcoin halvings occur approximately every 4 years (210,000 blocks), reducing the block reward by 50%.'),
    (v_l, 'What is a common sign of a crypto market top?', ARRAY['Low trading volume','High exchange inflows','Decreasing social media mentions','Low funding rates'], 1,
     'High exchange inflows often signal that holders are moving coins to sell, which can indicate a market top.');

  /* ─── Course 5: Psychology of Trading — Modules & Lessons ─── */

  insert into public.course_modules (id, course_id, title, sort_order)
  values (gen_random_uuid(), v_c5, 'Trading Mindset', 0)
  returning id into v_m;

  insert into public.lessons (module_id, course_id, title, type, duration_text, sort_order)
  values
    (v_m, v_c5, 'The Trader''s Mental Framework', 'video', '14m', 0),
    (v_m, v_c5, 'Managing Fear and Greed', 'video', '18m', 1),
    (v_m, v_c5, 'Overcoming FOMO', 'article', '12m', 2);

  insert into public.course_modules (id, course_id, title, sort_order)
  values (gen_random_uuid(), v_c5, 'Building Discipline', 1)
  returning id into v_m;

  insert into public.lessons (module_id, course_id, title, type, duration_text, sort_order)
  values
    (v_m, v_c5, 'Creating Trading Routines', 'video', '16m', 0),
    (v_m, v_c5, 'Journaling for Mental Health', 'video', '15m', 1);

  -- Quiz for Course 5
  insert into public.lessons (id, module_id, course_id, title, type, duration_text, sort_order)
  values (gen_random_uuid(), v_m, v_c5, 'Psychology Quiz', 'quiz', '8m', 2)
  returning id into v_l;

  insert into public.quiz_questions (lesson_id, question, options, correct_index, explanation) values
    (v_l, 'What is "revenge trading"?', ARRAY['Trading based on news events','Trading to recover losses impulsively','Trading in the revenge session','Trading against the trend'], 1,
     'Revenge trading is the emotional impulse to immediately recover losses by taking oversized or impulsive trades.'),
    (v_l, 'The best way to handle a losing streak is to:', ARRAY['Trade more aggressively','Take a break and review your journal','Switch to a new strategy immediately','Increase leverage'], 1,
     'Taking a break allows emotional reset. Reviewing your journal helps identify if losses are from poor execution or normal variance.'),
    (v_l, 'FOMO stands for:', ARRAY['Fear Of Missing Out','Focus On Market Openings','Fast Order Market Operations','Fund Of Managed Options'], 0,
     'FOMO (Fear Of Missing Out) is the anxiety that others are profiting from opportunities you''re not taking.');

  /* ─── Course 6: Algorithmic Trading Basics — Modules & Lessons ─── */

  insert into public.course_modules (id, course_id, title, sort_order)
  values (gen_random_uuid(), v_c6, 'Introduction to Algo Trading', 0)
  returning id into v_m;

  insert into public.lessons (module_id, course_id, title, type, duration_text, sort_order)
  values
    (v_m, v_c6, 'What is Algorithmic Trading?', 'video', '12m', 0),
    (v_m, v_c6, 'Algo Trading for Prop Firms', 'video', '18m', 1),
    (v_m, v_c6, 'Choosing Your Tech Stack', 'article', '14m', 2);

  insert into public.course_modules (id, course_id, title, sort_order)
  values (gen_random_uuid(), v_c6, 'Building Your First Algorithm', 1)
  returning id into v_m;

  insert into public.lessons (module_id, course_id, title, type, duration_text, sort_order)
  values
    (v_m, v_c6, 'Moving Average Crossover Strategy', 'video', '25m', 0),
    (v_m, v_c6, 'Backtesting Fundamentals', 'video', '22m', 1),
    (v_m, v_c6, 'Avoiding Overfitting', 'article', '16m', 2);

  -- Quiz for Course 6
  insert into public.lessons (id, module_id, course_id, title, type, duration_text, sort_order)
  values (gen_random_uuid(), v_m, v_c6, 'Algo Trading Quiz', 'quiz', '12m', 3)
  returning id into v_l;

  insert into public.quiz_questions (lesson_id, question, options, correct_index, explanation) values
    (v_l, 'What is "overfitting" in algorithmic trading?', ARRAY['Using too many indicators','Optimizing a strategy too closely to historical data','Trading too frequently','Using too much leverage'], 1,
     'Overfitting means a strategy is tuned too closely to past data, capturing noise rather than real patterns, leading to poor live performance.'),
    (v_l, 'A backtest shows 90% win rate. This is:', ARRAY['Guaranteed future performance','Likely overfitted and unreliable','Perfect strategy, deploy immediately','Average performance'], 1,
     'Extremely high backtest win rates almost always indicate overfitting. Real-world performance typically degrades significantly.'),
    (v_l, 'Which is a common algo trading strategy?', ARRAY['Random entry/exit','Mean reversion','Coin flip trading','Social media following'], 1,
     'Mean reversion strategies bet that prices will return to their average, and are among the most studied algorithmic approaches.');

  /* ─── Learning Paths ─── */

  insert into public.learning_paths (id, title, description)
  values (gen_random_uuid(), 'Beginner Trader',
    'Start your prop trading journey with the fundamentals. Build a strong foundation in trading basics, psychological resilience, and risk management.')
  returning id into v_p1;

  insert into public.learning_path_courses (path_id, course_id, sort_order)
  values
    (v_p1, v_c1, 0),
    (v_p1, v_c5, 1),
    (v_p1, v_c3, 2);

  insert into public.learning_paths (id, title, description)
  values (gen_random_uuid(), 'Advanced Trader',
    'Level up with specialized market analysis and systematic trading. Deep dive into specific markets and learn to automate your edge.')
  returning id into v_p2;

  insert into public.learning_path_courses (path_id, course_id, sort_order)
  values
    (v_p2, v_c2, 0),
    (v_p2, v_c4, 1),
    (v_p2, v_c6, 2);

END $$;
