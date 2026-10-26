-- Let a signed-in person delete their own sign-in account.
--
-- Neon's managed auth doesn't offer self-service deletion through the SDK
-- (delete-user returns user_not_found), so the website deletes the caller's row in
-- neon_auth."user" through this function. It takes no arguments: it can only ever
-- delete the account whose id is in app.user_id (set by asUser), and only after the
-- app has re-checked the password. Sessions, linked accounts, and organization
-- memberships cascade. The website role still has no direct access to neon_auth.

create or replace function delete_my_auth_account() returns integer
  language plpgsql security definer
  set search_path = public, neon_auth
  as $$
declare
  me text := app_user_id();
  removed integer;
begin
  if me is null or me = '' then
    raise exception 'not signed in';
  end if;
  delete from neon_auth.verification v
    using neon_auth."user" u
    where u.id::text = me and v.identifier = u.email;
  delete from neon_auth."user" where id::text = me;
  get diagnostics removed = row_count;
  return removed;
end $$;

revoke all on function delete_my_auth_account() from public;
grant execute on function delete_my_auth_account() to lanternway_app;
