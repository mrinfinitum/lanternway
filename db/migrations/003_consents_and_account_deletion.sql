-- Consent records (who agreed to what, which policy version, when) and what the
-- website needs to let a parent delete their own account and family.

create table if not exists consents (
  id             uuid primary key default gen_random_uuid(),
  user_id        text not null,
  kind           text not null check (kind in (
                   'terms', 'privacy', 'health_data_collection', 'adult_guardian', 'test_data', 'share_profile')),
  policy_version text not null,
  -- e.g. for share_profile: which child and which sections were shared.
  details        jsonb not null default '{}',
  granted_at     timestamptz not null default now(),
  withdrawn_at   timestamptz
);
create index if not exists consents_user_idx on consents (user_id);

alter table consents enable row level security;

-- Each person sees, records, withdraws, and (when deleting their account) removes only their own consents.
drop policy if exists consents_select on consents;
create policy consents_select on consents for select using (user_id = app_user_id());
drop policy if exists consents_insert on consents;
create policy consents_insert on consents for insert with check (user_id = app_user_id());
drop policy if exists consents_update on consents;
create policy consents_update on consents for update using (user_id = app_user_id()) with check (user_id = app_user_id());
drop policy if exists consents_delete on consents;
create policy consents_delete on consents for delete using (user_id = app_user_id());

grant select, insert, update, delete on consents to lanternway_app;

-- Account deletion: an admin may delete their own family (cascades to members and children),
-- and anyone may remove their own membership from a family.
drop policy if exists families_delete on families;
create policy families_delete on families for delete
  using (id in (select my_admin_family_ids()));
grant delete on families to lanternway_app;

drop policy if exists members_delete on family_members;
create policy members_delete on family_members for delete
  using (family_id in (select my_admin_family_ids()) or user_id = app_user_id());
