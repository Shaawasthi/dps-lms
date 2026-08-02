create table if not exists public.remedy_logs (
  id               uuid        primary key default uuid_generate_v4(),
  student_id       text        not null,
  student_name     text        not null,
  curriculum_id    uuid        not null,
  unit             text        not null,
  session_name     text        not null,
  misconception_count int      not null default 0,
  theory_count     int         not null default 0,
  understanding_count int      not null default 0,
  application_count int        not null default 0,
  total_questions  int         not null default 0,
  generated_at     timestamptz not null default now(),
  generated_by     uuid        references auth.users(id)
);

alter table public.remedy_logs enable row level security;

create policy "Authenticated full access"
  on public.remedy_logs
  for all
  to authenticated
  using (true)
  with check (true);
