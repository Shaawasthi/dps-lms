-- Expand level check to include Bloom's taxonomy levels used by remedy questions
alter table public.questions
  drop constraint if exists questions_level_check;

alter table public.questions
  add constraint questions_level_check
  check (level in (
    'Theory', 'Understanding', 'Application',          -- legacy diagnostic levels
    'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'  -- Bloom's taxonomy (remedy)
  ));

-- Difficulty level for remedy questions (40% Easy / 30% Medium / 30% Hard target)
alter table public.questions
  add column if not exists difficulty text
  check (difficulty in ('Easy', 'Medium', 'Hard'));

-- Question format type (affects PDF rendering)
alter table public.questions
  add column if not exists question_type text
  check (question_type in ('MCQ', 'Assertion-Reason', 'Short Answer', 'Long Answer'));
