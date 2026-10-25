-- Reference list of medication names for type-ahead when adding a medication.
-- Not family data: no child or parent information ever goes in this table.
-- Names, brands, class, and forms only. No doses or strengths (CLAUDE.md rule 2).

create extension if not exists pg_trgm;

create table if not exists medication_catalog (
  id           serial primary key,
  generic_name text        not null unique,
  brand_names  text[]      not null default '{}',
  drug_class   text        not null,
  forms        text[]      not null default '{}',
  -- Lowercased generic + brand names, for searching.
  search_text  text        not null,
  source       text        not null default 'lanternway-curated',
  updated_at   timestamptz not null default now()
);

create index if not exists medication_catalog_search_trgm
  on medication_catalog using gin (search_text gin_trgm_ops);

-- Read-only role for the website. It can search this table and nothing else.
do $$
begin
  if not exists (select from pg_roles where rolname = 'lanternway_app') then
    create role lanternway_app login;
  end if;
end $$;

revoke all on all tables in schema public from lanternway_app;
grant usage on schema public to lanternway_app;
grant select on medication_catalog to lanternway_app;
