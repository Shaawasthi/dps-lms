-- Add misconception tags to each answer option in questions
alter table questions
  add column option_1_tag text,
  add column option_2_tag text,
  add column option_3_tag text,
  add column option_4_tag text;

-- Misconceptions live under a learning goal (curriculum entry)
create table misconceptions (
  code          text primary key,   -- e.g. G7C1.4
  curriculum_id uuid references curriculum(id) on delete cascade,
  description   text not null
);
