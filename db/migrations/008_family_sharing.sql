-- Family sharing: invite a co-parent, grandparent or sitter with a role.
--   admin – everything, including members, export and deletion
--   log   – reads everything; adds and edits daily logs and milestones only
--   view  – reads everything; changes nothing
--
-- Invites are private links. Like check-in links, only a SHA-256 hash of the token
-- is stored, so a link is shown once. Anyone with an unexpired, unrevoked link can
-- accept it once, after signing in. Joining goes through accept_family_invite().
-- A family always keeps at least one admin.

create table if not exists family_invites (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families (id) on delete cascade,
  token_hash  text not null unique,
  role        text not null check (role in ('admin', 'log', 'view')),
  label       text not null check (char_length(label) between 1 and 80),
  created_by  text not null default app_user_id(),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  accepted_by text,
  revoked_at  timestamptz
);
create index if not exists family_invites_family_idx on family_invites (family_id);

alter table family_invites enable row level security;

-- Only the family's admins see and manage its invites.
drop policy if exists invites_select on family_invites;
create policy invites_select on family_invites for select using (family_id in (select my_admin_family_ids()));
drop policy if exists invites_insert on family_invites;
create policy invites_insert on family_invites for insert
  with check (family_id in (select my_admin_family_ids()) and created_by = app_user_id());
drop policy if exists invites_update on family_invites;
create policy invites_update on family_invites for update
  using (family_id in (select my_admin_family_ids()))
  with check (family_id in (select my_admin_family_ids()));

grant select, insert, update on family_invites to lanternway_app;

-- What the public invite page may know: who sent it, the role, and whether it still works.
-- Nothing about the family or its children.
create or replace function family_invite_preview(p_token text)
  returns table (inviter_name text, role text, status text)
  language sql stable security definer set search_path = public, neon_auth
  as $$
    select coalesce(nullif(split_part(u.name, ' ', 1), ''), 'Someone'),
           i.role,
           case when i.revoked_at is not null or i.expires_at <= now() then 'expired'
                when i.accepted_at is not null then 'used'
                else 'open' end
      from family_invites i
      left join neon_auth."user" u on u.id::text = i.created_by
     where i.token_hash = encode(digest(p_token, 'sha256'), 'hex')
  $$;

-- Join the family as the signed-in person. Returns 'joined', 'already' (already a
-- member: role unchanged, link left unused), 'used', or 'invalid' (unknown, revoked or expired).
create or replace function accept_family_invite(p_token text)
  returns text
  language plpgsql security definer set search_path = public
  as $$
declare
  me text := app_user_id();
  inv family_invites;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  select * into inv from family_invites
   where token_hash = encode(digest(p_token, 'sha256'), 'hex')
   for update;
  if not found or inv.revoked_at is not null or inv.expires_at <= now() then
    return 'invalid';
  end if;
  if inv.accepted_at is not null then
    return case when inv.accepted_by = me then 'already' else 'used' end;
  end if;
  if exists (select 1 from family_members where family_id = inv.family_id and user_id = me) then
    return 'already';
  end if;
  insert into family_members (family_id, user_id, role) values (inv.family_id, me, inv.role);
  update family_invites set accepted_at = now(), accepted_by = me where id = inv.id;
  return 'joined';
end $$;

-- Members of the signed-in person's families, with their names and emails (which the
-- website role can't read from neon_auth directly).
create or replace function my_family_members()
  returns table (family_id uuid, user_id text, role text, name text, email text, joined_at timestamptz)
  language sql stable security definer set search_path = public, neon_auth
  as $$
    select m.family_id, m.user_id, m.role, u.name, u.email, m.created_at
      from family_members m
      left join neon_auth."user" u on u.id::text = m.user_id
     where m.family_id in (select my_family_ids())
     order by m.created_at
  $$;

revoke all on function family_invite_preview(text), accept_family_invite(text), my_family_members() from public;
grant execute on function family_invite_preview(text), accept_family_invite(text), my_family_members() to lanternway_app;

-- Admins change roles. (Removing members: members_delete in migration 003 — admins, or yourself.)
drop policy if exists members_update on family_members;
create policy members_update on family_members for update
  using (family_id in (select my_admin_family_ids()))
  with check (family_id in (select my_admin_family_ids()) and role in ('admin', 'log', 'view'));
grant update (role) on family_members to lanternway_app;

-- A family always keeps an admin. Deleting the whole family (cascade) is still fine.
create or replace function keep_an_admin() returns trigger
  language plpgsql set search_path = public
  as $$
begin
  if exists (select 1 from families where id = old.family_id)
     and not exists (select 1 from family_members where family_id = old.family_id and role = 'admin') then
    raise exception 'A family needs at least one admin.' using errcode = 'P0001', hint = 'last_admin';
  end if;
  return null;
end $$;
drop trigger if exists family_members_keep_admin on family_members;
create trigger family_members_keep_admin after update or delete on family_members
  for each row execute function keep_an_admin();

-- The log role writes daily logs and milestones only; everything else is admin-only.
drop policy if exists records_insert on records;
create policy records_insert on records for insert
  with check (family_id in (select my_admin_family_ids())
    or (family_id in (select my_writable_family_ids()) and kind in ('log', 'milestone')));
drop policy if exists records_update on records;
create policy records_update on records for update
  using (family_id in (select my_admin_family_ids())
    or (family_id in (select my_writable_family_ids()) and kind in ('log', 'milestone')))
  with check (family_id in (select my_admin_family_ids())
    or (family_id in (select my_writable_family_ids()) and kind in ('log', 'milestone')));
drop policy if exists records_delete on records;
create policy records_delete on records for delete
  using (family_id in (select my_admin_family_ids())
    or (family_id in (select my_writable_family_ids()) and kind in ('log', 'milestone')));

-- About Me (children) and teacher check-in links: admins only.
drop policy if exists children_insert on children;
create policy children_insert on children for insert with check (family_id in (select my_admin_family_ids()));
drop policy if exists children_update on children;
create policy children_update on children for update
  using (family_id in (select my_admin_family_ids()))
  with check (family_id in (select my_admin_family_ids()));

drop policy if exists respondents_write on checkin_respondents;
create policy respondents_write on checkin_respondents for all
  using (family_id in (select my_admin_family_ids()))
  with check (family_id in (select my_admin_family_ids()));
drop policy if exists links_write on checkin_links;
create policy links_write on checkin_links for all
  using (family_id in (select my_admin_family_ids()))
  with check (family_id in (select my_admin_family_ids()));
drop policy if exists checkins_delete on checkins;
create policy checkins_delete on checkins for delete using (family_id in (select my_admin_family_ids()));

-- Inviting someone into the family is recorded as a consent, like check-in links.
alter table consents drop constraint if exists consents_kind_check;
alter table consents add constraint consents_kind_check check (kind in (
  'terms', 'privacy', 'health_data_collection', 'adult_guardian', 'test_data', 'share_profile', 'share_checkin', 'share_family'));
