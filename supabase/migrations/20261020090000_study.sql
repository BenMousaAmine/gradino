alter table public.items
  add column kind text not null default 'exercise' check (kind in ('exercise', 'problem'));

alter table public.item_keys
  add column solution jsonb not null default '[]'::jsonb;

create table public.lessons (
  skill_id text primary key references public.skills (id) on delete cascade,
  content jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.item_templates (
  id text primary key,
  skill_id text not null references public.skills (id) on delete cascade,
  level text not null check (level in ('base', 'medium', 'advanced')),
  generator text not null,
  params jsonb not null default '{}'::jsonb,
  status text not null default 'published' check (status in ('draft', 'published')),
  updated_at timestamptz not null default now()
);

create index item_templates_skill_id_idx on public.item_templates (skill_id);

create table public.skill_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_id text not null references public.skills (id) on delete cascade,
  status text not null default 'learning' check (status in ('learning', 'review', 'mastered')),
  level text not null default 'base' check (level in ('base', 'medium', 'advanced')),
  review_step smallint not null default 0,
  next_review_on date,
  lesson_done_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  block smallint not null default 0,
  block_started_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, day)
);

create table public.practice_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_id text not null references public.skills (id) on delete cascade,
  level text not null check (level in ('base', 'medium', 'advanced')),
  source text not null check (source in ('template', 'item')),
  source_id text not null,
  seed integer,
  purpose text not null check (purpose in ('practice', 'review', 'retry', 'warmup', 'problem', 'check')),
  session_id uuid references public.study_sessions (id) on delete set null,
  content jsonb not null,
  answer jsonb not null,
  score real not null check (score between 0 and 1),
  error_tag text,
  details jsonb not null default '{}'::jsonb,
  time_ms integer not null check (time_ms >= 0),
  created_at timestamptz not null default now()
);

create index practice_answers_user_created_idx on public.practice_answers (user_id, created_at desc);
create index practice_answers_user_skill_idx on public.practice_answers (user_id, skill_id, level, purpose, created_at desc);

alter table public.lessons enable row level security;
alter table public.item_templates enable row level security;
alter table public.skill_progress enable row level security;
alter table public.study_sessions enable row level security;
alter table public.practice_answers enable row level security;

create policy "lessons: read" on public.lessons for select to authenticated using (true);

create policy "item_templates: read published" on public.item_templates
  for select to authenticated using (status = 'published');

create policy "skill_progress: read own" on public.skill_progress
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "study_sessions: read own" on public.study_sessions
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "practice_answers: read own" on public.practice_answers
  for select to authenticated using ((select auth.uid()) = user_id);
