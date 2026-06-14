-- Add unique constraint so the curriculum CSV upload can upsert safely
alter table curriculum
  add constraint curriculum_class_unit_goal_unique
  unique (class_uid, unit, learning_goal);
