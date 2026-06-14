-- Allow authenticated users full access to all app tables
-- (single-admin app, all logged-in users are trusted)

alter table classes enable row level security;
alter table students enable row level security;
alter table curriculum enable row level security;
alter table questions enable row level security;
alter table misconceptions enable row level security;
alter table upload_batches enable row level security;
alter table responses enable row level security;

create policy "authenticated full access" on classes
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on students
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on curriculum
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on questions
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on misconceptions
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on upload_batches
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on responses
  for all to authenticated using (true) with check (true);
