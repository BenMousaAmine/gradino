create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.subjects (
  id text primary key,
  title text not null,
  position integer not null default 0
);

create table public.areas (
  id text primary key,
  subject_id text not null references public.subjects (id) on delete cascade,
  title text not null,
  position integer not null default 0
);

create table public.skills (
  id text primary key,
  area_id text not null references public.areas (id) on delete cascade,
  title text not null,
  school_year smallint check (school_year between 1 and 3),
  position integer not null default 0
);

create table public.skill_prerequisites (
  skill_id text not null references public.skills (id) on delete cascade,
  prerequisite_id text not null references public.skills (id) on delete cascade,
  primary key (skill_id, prerequisite_id),
  check (skill_id <> prerequisite_id)
);

create table public.items (
  id text primary key,
  skill_id text not null references public.skills (id),
  type text not null check (type in ('input', 'choice', 'multi_choice', 'order')),
  level text not null check (level in ('base', 'medium', 'advanced')),
  content jsonb not null,
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_skill_id_idx on public.items (skill_id);

create table public.item_keys (
  item_id text primary key references public.items (id) on delete cascade,
  key jsonb not null
);

create table public.assessments (
  id text primary key,
  subject_id text not null references public.subjects (id),
  kind text not null check (kind in ('diagnostic')),
  title text not null,
  description text not null default '',
  config jsonb not null default '{}'::jsonb
);

create table public.assessment_sections (
  id text primary key,
  assessment_id text not null references public.assessments (id) on delete cascade,
  area_id text not null references public.areas (id),
  code text not null,
  title text not null,
  part smallint not null default 1,
  position integer not null,
  optional_question text,
  unique (assessment_id, code)
);

create table public.assessment_items (
  section_id text not null references public.assessment_sections (id) on delete cascade,
  item_id text not null references public.items (id),
  position integer not null,
  primary key (section_id, item_id)
);

create index assessment_items_item_id_idx on public.assessment_items (item_id);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  assessment_id text not null references public.assessments (id),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  current_part smallint not null default 1,
  section_choices jsonb not null default '{}'::jsonb,
  result jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index attempts_user_assessment_idx on public.attempts (user_id, assessment_id);

create unique index attempts_one_in_progress_idx
  on public.attempts (user_id, assessment_id)
  where status = 'in_progress';

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.items (id),
  answer jsonb not null,
  score real not null check (score between 0 and 1),
  error_tag text,
  details jsonb not null default '{}'::jsonb,
  time_ms integer not null check (time_ms >= 0),
  created_at timestamptz not null default now(),
  unique (attempt_id, item_id)
);

create index responses_user_id_idx on public.responses (user_id);
create index responses_item_id_idx on public.responses (item_id);

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.areas enable row level security;
alter table public.skills enable row level security;
alter table public.skill_prerequisites enable row level security;
alter table public.items enable row level security;
alter table public.item_keys enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_sections enable row level security;
alter table public.assessment_items enable row level security;
alter table public.attempts enable row level security;
alter table public.responses enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "subjects: read" on public.subjects for select to authenticated using (true);
create policy "areas: read" on public.areas for select to authenticated using (true);
create policy "skills: read" on public.skills for select to authenticated using (true);
create policy "skill_prerequisites: read" on public.skill_prerequisites for select to authenticated using (true);
create policy "items: read published" on public.items for select to authenticated using (status = 'published');
create policy "assessments: read" on public.assessments for select to authenticated using (true);
create policy "assessment_sections: read" on public.assessment_sections for select to authenticated using (true);
create policy "assessment_items: read" on public.assessment_items for select to authenticated using (true);

create policy "attempts: read own" on public.attempts
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "responses: read own" on public.responses
  for select to authenticated using ((select auth.uid()) = user_id);
