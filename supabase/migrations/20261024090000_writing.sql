create table public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text not null references public.subjects (id),
  prompt_id text not null check (char_length(prompt_id) between 1 and 80),
  prompt jsonb not null,
  body text not null check (char_length(body) between 1 and 6000),
  words integer not null check (words >= 0),
  time_ms integer not null check (time_ms >= 0),
  stats jsonb not null default '{}'::jsonb,
  ai_status text not null default 'none' check (ai_status in ('none', 'pending', 'done', 'error')),
  ai_feedback jsonb,
  ai_model text,
  ai_error text check (char_length(ai_error) <= 500),
  review_status text not null default 'pending' check (review_status in ('pending', 'done')),
  review_score smallint check (review_score between 1 and 10),
  review_comment text check (char_length(review_comment) <= 4000),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index writing_submissions_user_created_idx on public.writing_submissions (user_id, created_at desc);
create index writing_submissions_review_idx on public.writing_submissions (review_status, created_at);

alter table public.writing_submissions enable row level security;

create policy "writing_submissions: read own" on public.writing_submissions
  for select to authenticated using ((select auth.uid()) = user_id);
