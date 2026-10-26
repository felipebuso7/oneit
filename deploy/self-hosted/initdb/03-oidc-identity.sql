create or replace function auth.upsert_oidc_user(
  target_subject text,
  target_email text,
  target_full_name text
)
returns auth.users
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  result auth.users%rowtype;
begin
  if coalesce(trim(target_subject), '') = ''
     or coalesce(trim(target_email), '') = '' then
    raise exception 'OIDC_SUBJECT_AND_EMAIL_REQUIRED';
  end if;

  insert into auth.users (oidc_subject, email, full_name)
  values (trim(target_subject), lower(trim(target_email)), nullif(trim(target_full_name), ''))
  on conflict (oidc_subject) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        updated_at = clock_timestamp()
  returning * into result;

  return result;
end;
$$;

grant execute on function auth.upsert_oidc_user(text, text, text) to authenticated;
