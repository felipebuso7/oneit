#!/bin/sh
set -eu

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=app_user="$ONEIT_DB_APP_USER" \
  --set=app_password="$ONEIT_DB_APP_PASSWORD" \
  --set=idp_user="$ONEIT_IDP_DB_USER" \
  --set=idp_password="$ONEIT_IDP_DB_PASSWORD" <<'EOSQL'
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end
$$;

select format(
  'create role %I login nosuperuser nocreatedb nocreaterole noreplication password %L',
  :'app_user',
  :'app_password'
)
where not exists (select 1 from pg_roles where rolname = :'app_user') \gexec

select format(
  'create role %I login nosuperuser nocreatedb nocreaterole noreplication password %L',
  :'idp_user',
  :'idp_password'
)
where not exists (select 1 from pg_roles where rolname = :'idp_user') \gexec

select format('grant authenticated to %I', :'app_user') \gexec
select format('grant connect on database %I to authenticated', current_database()) \gexec
EOSQL

if ! psql --username "$POSTGRES_USER" --dbname postgres --tuples-only --no-align \
  --command "select 1 from pg_database where datname = '$ONEIT_IDP_DB'" | grep -q '^1$'; then
  createdb --username "$POSTGRES_USER" --owner "$ONEIT_IDP_DB_USER" "$ONEIT_IDP_DB"
fi
