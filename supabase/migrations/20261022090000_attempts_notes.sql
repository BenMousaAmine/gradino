alter table public.practice_answers
  add column attempts smallint not null default 1 check (attempts between 1 and 2),
  add column final_score real check (final_score between 0 and 1),
  add column note text check (char_length(note) <= 4000),
  add column note_source text check (note_source in ('typed', 'voice', 'mixed')),
  add column note_ms integer check (note_ms >= 0);

update public.practice_answers set final_score = score where final_score is null;
