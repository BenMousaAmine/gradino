create table public.activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.study_sessions (id) on delete set null,
  type text not null check (char_length(type) between 1 and 64),
  skill_id text,
  payload jsonb not null default '{}'::jsonb,
  client_at timestamptz,
  created_at timestamptz not null default now()
);

create index activity_events_user_created_idx on public.activity_events (user_id, created_at desc);
create index activity_events_user_type_idx on public.activity_events (user_id, type, created_at desc);

alter table public.activity_events enable row level security;

create policy "activity_events: read own" on public.activity_events
  for select to authenticated using ((select auth.uid()) = user_id);
