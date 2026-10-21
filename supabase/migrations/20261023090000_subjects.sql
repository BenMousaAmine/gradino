alter table public.study_sessions
  add column subject_id text not null default 'math' references public.subjects (id);

alter table public.study_sessions alter column subject_id drop default;

alter table public.study_sessions drop constraint study_sessions_user_id_day_key;

alter table public.study_sessions
  add constraint study_sessions_user_subject_day_key unique (user_id, subject_id, day);
