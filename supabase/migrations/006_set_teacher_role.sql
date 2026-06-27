-- Run this in the Supabase SQL Editor AFTER creating the teacher account
-- in the Supabase Auth dashboard (Authentication → Users → Add User).
-- Email: teacher@dpsnashik.in  |  Password: dpslmsclass@2026
--
-- This marks that user as a teacher so the LMS shows read-only views.

update auth.users
set raw_user_meta_data = jsonb_set(
  coalesce(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"teacher"'
)
where email = 'teacher@dpsnashik.in';
