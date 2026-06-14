-- Curriculum is shared across sections of the same grade+subject.
-- Remove class_uid FK and replace with grade, keeping the existing subject column.
alter table curriculum drop column if exists class_uid;
alter table curriculum add column if not exists grade text not null default '';
alter table curriculum add constraint curriculum_grade_subject_unit_goal_unique
  unique (grade, subject, unit, learning_goal);
