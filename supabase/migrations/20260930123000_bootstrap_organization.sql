-- Bootstrap restrito ao servidor usando a service-role key.
-- Nunca chamar esta função a partir do browser.
create or replace function public.bootstrap_organization(
  target_user_id uuid,
  target_email text,
  target_full_name text,
  organization_legal_name text,
  organization_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_organization_id uuid;
begin
  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'The target user must exist in auth.users.';
  end if;

  insert into public.organizations (legal_name, display_name)
  values (organization_legal_name, organization_display_name)
  returning id into created_organization_id;

  insert into public.user_profiles (id, full_name, email)
  values (target_user_id, target_full_name, target_email)
  on conflict (id) do update set full_name = excluded.full_name, email = excluded.email;

  insert into public.user_roles (user_id, organization_id, role)
  values (target_user_id, created_organization_id, 'SUPER_ADMIN')
  on conflict do nothing;

  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, source)
  values (created_organization_id, target_user_id, 'ORGANIZATION_BOOTSTRAPPED', 'organization', created_organization_id, 'SERVER');

  return created_organization_id;
end;
$$;

revoke all on function public.bootstrap_organization(uuid, text, text, text, text) from public;
grant execute on function public.bootstrap_organization(uuid, text, text, text, text) to service_role;
