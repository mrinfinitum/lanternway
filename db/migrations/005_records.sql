-- Everything else about a child: daily logs, medications and their changes, the care
-- team, therapy goals and sessions, IEP/504 plans with goals and supports, school
-- messages, and milestones. One table, one set of row-level security policies.
--
-- `data` holds the record as the app's TypeScript type (minus `id`); the server
-- validates every field before writing (src/lib/record-schemas.ts). `parent_id` links
-- e.g. a dose change to its medication, or a goal to its plan.

-- Lets records point at (child, family) together, so a record can never belong to a
-- child from a different family.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'children_id_family_unique') then
    alter table children add constraint children_id_family_unique unique (id, family_id);
  end if;
end $$;

create table if not exists records (
  id          uuid primary key,
  family_id   uuid not null references families (id) on delete cascade,
  child_id    uuid not null,
  kind        text not null check (kind in (
                'log', 'milestone',
                'medication', 'medication_change',
                'provider', 'therapy_goal', 'therapy_session',
                'iep_plan', 'iep_goal', 'accommodation', 'school_message')),
  parent_id   uuid references records (id) on delete cascade,
  occurred_on date,
  data        jsonb not null,
  created_by  text not null default app_user_id(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (child_id, family_id) references children (id, family_id) on delete cascade
);
create index if not exists records_child_kind_idx on records (child_id, kind);
create index if not exists records_parent_idx on records (parent_id);

alter table records enable row level security;

drop policy if exists records_select on records;
create policy records_select on records for select
  using (family_id in (select my_family_ids()));
drop policy if exists records_insert on records;
create policy records_insert on records for insert
  with check (family_id in (select my_writable_family_ids()));
drop policy if exists records_update on records;
create policy records_update on records for update
  using (family_id in (select my_writable_family_ids()))
  with check (family_id in (select my_writable_family_ids()));
drop policy if exists records_delete on records;
create policy records_delete on records for delete
  using (family_id in (select my_writable_family_ids()));

grant select, insert, update, delete on records to lanternway_app;
