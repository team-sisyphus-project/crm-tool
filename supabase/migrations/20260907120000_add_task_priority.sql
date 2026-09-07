-- A task can be flagged important by a person, independently of its due date.
-- Nullable with no default: every existing row is simply unflagged.
alter table public.tasks add column if not exists priority text;
