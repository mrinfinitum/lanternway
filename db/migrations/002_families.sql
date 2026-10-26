-- Families, their members, and their children. Every table has row-level security.
--
-- How the database knows who is asking: the website opens a transaction and runs
--   select set_config('app.user_id', '<neon_auth user id>', true);
-- before any query (see src/lib/db.ts). Policies compare against app_user_id().
-- The website role (lanternway_app) is not the table owner, so RLS always applies.

-- Who is asking (null when unset, so policies fail closed).
create or replace function app_user_id() returns text
  language sql stable
  as $$ select nullif(current_setting('app.user_id', true), '') $$;

create table if not exists families (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'Our family',
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists family_members (
  family_id  uuid not null references families (id) on delete cascade,
  user_id    text not null,
  role       text not null default 'admin' check (role in ('admin', 'log', 'view')),
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index if not exists family_members_user_idx on family_members (user_id);

-- One row per child. The profile (About Me fields) is a JSON document for now;
-- see ABOUT_ME_PLAN.md for splitting it into profile_items later.
create table if not exists children (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families (id) on delete cascade,
  profile    jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists children_family_idx on children (family_id);

-- Families the current user belongs to, and the ones they can write to.
-- SECURITY DEFINER so policies on family_members don't recurse into themselves.
create or replace function my_family_ids() returns setof uuid
  language sql stable security definer set search_path = public
  as $$ select family_id from family_members where user_id = app_user_id() $$;

create or replace function my_writable_family_ids() returns setof uuid
  language sql stable security definer set search_path = public
  as $$ select family_id from family_members where user_id = app_user_id() and role in ('admin', 'log') $$;

create or replace function my_admin_family_ids() returns setof uuid
  language sql stable security definer set search_path = public
  as $$ select family_id from family_members where user_id = app_user_id() and role = 'admin' $$;

alter table families enable row level security;
alter table family_members enable row level security;
alter table children enable row level security;

-- families: see the ones you belong to (or just created); create your own; admins rename.
drop policy if exists families_select on families;
create policy families_select on families for select
  using (id in (select my_family_ids()) or created_by = app_user_id());
drop policy if exists families_insert on families;
create policy families_insert on families for insert
  with check (created_by = app_user_id());
drop policy if exists families_update on families;
create policy families_update on families for update
  using (id in (select my_admin_family_ids()));

-- family_members: see members of your families; add yourself as the first admin of a
-- family you created; admins manage members (invites come later).
drop policy if exists members_select on family_members;
create policy members_select on family_members for select
  using (family_id in (select my_family_ids()));
drop policy if exists members_insert on family_members;
create policy members_insert on family_members for insert
  with check (
    (user_id = app_user_id() and role = 'admin'
      and family_id in (select id from families where created_by = app_user_id()))
    or family_id in (select my_admin_family_ids())
  );
drop policy if exists members_delete on family_members;
create policy members_delete on family_members for delete
  using (family_id in (select my_admin_family_ids()));

-- children: members read; admin and log roles write.
drop policy if exists children_select on children;
create policy children_select on children for select
  using (family_id in (select my_family_ids()));
drop policy if exists children_insert on children;
create policy children_insert on children for insert
  with check (family_id in (select my_writable_family_ids()));
drop policy if exists children_update on children;
create policy children_update on children for update
  using (family_id in (select my_writable_family_ids()))
  with check (family_id in (select my_writable_family_ids()));
drop policy if exists children_delete on children;
create policy children_delete on children for delete
  using (family_id in (select my_admin_family_ids()));

-- The website role: data access only through RLS. Still no DDL, and nothing else.
grant select, insert, update on families to lanternway_app;
grant select, insert, delete on family_members to lanternway_app;
grant select, insert, update, delete on children to lanternway_app;
grant execute on function app_user_id(), my_family_ids(), my_writable_family_ids(), my_admin_family_ids() to lanternway_app;
