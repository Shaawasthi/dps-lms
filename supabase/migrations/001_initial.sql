-- classes
create table classes (
  class_uid text primary key,
  grade text not null,
  section text not null,
  subject text not null,
  academic_year text not null
);

-- students
create table students (
  student_id text primary key, -- format: grade-section-roll e.g. 5-A-1001
  class_uid text references classes(class_uid),
  roll_number text not null,
  section text not null,
  name text not null
);

-- curriculum
create table curriculum (
  id uuid primary key default gen_random_uuid(),
  class_uid text references classes(class_uid),
  subject text not null,
  unit text not null,
  learning_goal text not null
);

-- questions
create table questions (
  question_uid text primary key,
  curriculum_id uuid references curriculum(id),
  question_text text not null,
  option_1 text, option_2 text, option_3 text, option_4 text,
  correct_answer text not null,
  level text check (level in ('Theory', 'Understanding', 'Application')),
  hint text,
  image_url text,
  is_remedy boolean default false
);

-- upload_batches
create table upload_batches (
  id uuid primary key default gen_random_uuid(),
  class_uid text references classes(class_uid),
  filename text,
  uploaded_at timestamptz default now(),
  row_count integer,
  status text default 'ok'
);

-- responses
create table responses (
  id uuid primary key default gen_random_uuid(),
  question_uid text references questions(question_uid),
  student_id text references students(student_id),
  upload_batch_id uuid references upload_batches(id),
  is_correct boolean,
  time_taken_secs numeric,
  response_option text,
  uploaded_at timestamptz default now()
);
