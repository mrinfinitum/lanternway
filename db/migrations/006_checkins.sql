-- Teacher & therapist check-ins (CLAUDE.md rule 4):
-- random unguessable links, scoped to one child + one respondent, with expiry and
-- revoke. Respondents never see the child's record: the public page only calls the
-- two SECURITY DEFINER functions below. Only a SHA-256 hash of each link token is
-- stored, so even someone with database access can't recreate working links.

create extension if not exists pgcrypto;

create table if not exists checkin_respondents (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families (id) on delete cascade,
  child_id   uuid not null,
  name       text not null check (length(name) between 1 and 80),
  role       text not null check (role in ('classroom-teacher', 'special-ed-teacher', 'aide', 'therapist', 'sitter')),
  email      text check (email is null or length(email) <= 120),
  created_at timestamptz not null default now(),
  foreign key (child_id, family_id) references children (id, family_id) on delete cascade,
  unique (id, family_id)
);

create table if not exists checkin_links (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families (id) on delete cascade,
  child_id      uuid not null,
  respondent_id uuid not null,
  token_hash    text not null unique,
  created_by    text not null default app_user_id(),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  revoked_at    timestamptz,
  last_used_at  timestamptz,
  foreign key (child_id, family_id) references children (id, family_id) on delete cascade,
  foreign key (respondent_id, family_id) references checkin_respondents (id, family_id) on delete cascade
);
create index if not exists checkin_links_child_idx on checkin_links (child_id);

create table if not exists checkins (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families (id) on delete cascade,
  child_id      uuid not null,
  respondent_id uuid not null,
  link_id       uuid not null references checkin_links (id) on delete cascade,
  date          date not null,
  ratings       jsonb not null,
  note          text check (note is null or length(note) <= 600),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (child_id, family_id) references children (id, family_id) on delete cascade,
  -- One check-in per link per day; sending again the same day updates it.
  unique (link_id, date)
);
create index if not exists checkins_child_date_idx on checkins (child_id, date);

alter table checkin_respondents enable row level security;
alter table checkin_links enable row level security;
alter table checkins enable row level security;

-- Family members read; admin and log roles manage respondents and links.
drop policy if exists respondents_select on checkin_respondents;
create policy respondents_select on checkin_respondents for select using (family_id in (select my_family_ids()));
drop policy if exists respondents_write on checkin_respondents;
create policy respondents_write on checkin_respondents for all
  using (family_id in (select my_writable_family_ids()))
  with check (family_id in (select my_writable_family_ids()));

drop policy if exists links_select on checkin_links;
create policy links_select on checkin_links for select using (family_id in (select my_family_ids()));
drop policy if exists links_write on checkin_links;
create policy links_write on checkin_links for all
  using (family_id in (select my_writable_family_ids()))
  with check (family_id in (select my_writable_family_ids()));

-- Check-ins are written only through submit_checkin(); families can read and remove them.
drop policy if exists checkins_select on checkins;
create policy checkins_select on checkins for select using (family_id in (select my_family_ids()));
drop policy if exists checkins_delete on checkins;
create policy checkins_delete on checkins for delete using (family_id in (select my_writable_family_ids()));

grant select, insert, update, delete on checkin_respondents, checkin_links to lanternway_app;
grant select, delete on checkins to lanternway_app;

-- What the public check-in page may know about a link: first name, respondent name,
-- expiry. Nothing else. Returns no row for unknown, revoked, or expired links.
create or replace function checkin_form_context(p_token text)
  returns table (child_first_name text, respondent_name text, expires_at timestamptz)
  language sql stable security definer set search_path = public
  as $$
    select c.profile->>'firstName', r.name, l.expires_at
      from checkin_links l
      join checkin_respondents r on r.id = l.respondent_id
      join children c on c.id = l.child_id
     where l.token_hash = encode(digest(p_token, 'sha256'), 'hex')
       and l.revoked_at is null
       and l.expires_at > now()
  $$;

-- Save a check-in from the public form. Validates the link and the ratings; one
-- check-in per link per day (sending again updates it). Returns true if saved.
create or replace function submit_checkin(p_token text, p_date date, p_focus int, p_mood int, p_behavior int, p_participation int, p_note text)
  returns boolean
  language plpgsql security definer set search_path = public
  as $$
declare
  l checkin_links%rowtype;
begin
  if p_focus not between 1 and 5 or p_mood not between 1 and 5
     or p_behavior not between 1 and 5 or p_participation not between 1 and 5 then
    return false;
  end if;
  select * into l from checkin_links
   where token_hash = encode(digest(p_token, 'sha256'), 'hex')
     and revoked_at is null and expires_at > now();
  if not found then
    return false;
  end if;
  insert into checkins (family_id, child_id, respondent_id, link_id, date, ratings, note)
  values (l.family_id, l.child_id, l.respondent_id, l.id, p_date,
          jsonb_build_object('focus', p_focus, 'mood', p_mood, 'behavior', p_behavior, 'participation', p_participation),
          nullif(left(trim(coalesce(p_note, '')), 600), ''))
  on conflict (link_id, date) do update
    set ratings = excluded.ratings, note = excluded.note, updated_at = now();
  update checkin_links set last_used_at = now() where id = l.id;
  return true;
end $$;

revoke all on function checkin_form_context(text) from public;
revoke all on function submit_checkin(text, date, int, int, int, int, text) from public;
grant execute on function checkin_form_context(text) to lanternway_app;
grant execute on function submit_checkin(text, date, int, int, int, int, text) to lanternway_app;

-- New consent kind: asking someone for check-ins about your child.
alter table consents drop constraint if exists consents_kind_check;
alter table consents add constraint consents_kind_check check (kind in (
  'terms', 'privacy', 'health_data_collection', 'adult_guardian', 'test_data', 'share_profile', 'share_checkin'));
