-- Compatibility contract for the existing domain migrations.
-- The application writes the actor identity with set_config inside a transaction.
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  oidc_subject text not null unique,
  email citext not null unique,
  full_name text,
  active boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('oneit.user_id', true), '')::uuid
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(nullif(current_setting('oneit.role', true), ''), 'authenticated')
$$;

grant usage on schema auth to authenticated;
grant select on auth.users to authenticated;
grant execute on function auth.uid() to authenticated;
grant execute on function auth.role() to authenticated;
