-- Medication reminders: when a parent wants to be reminded about a medication,
-- how (push or text), and whether the reminder may name the medication.
-- Stored as records (kind 'medication_reminder', parent = the medication), so the
-- existing family-only row-level security policies on `records` cover them, and
-- deleting a medication deletes its reminders (parent_id on delete cascade).
--
-- Sending is not switched on yet; these are the saved settings.

alter table records drop constraint if exists records_kind_check;
alter table records add constraint records_kind_check check (kind in (
  'log', 'milestone',
  'medication', 'medication_change', 'medication_reminder',
  'provider', 'therapy_goal', 'therapy_session',
  'iep_plan', 'iep_goal', 'accommodation', 'school_message'));
