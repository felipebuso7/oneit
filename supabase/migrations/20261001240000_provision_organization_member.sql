-- A chamada e feita exclusivamente pelo servidor usando a service role, apos o convite do Auth.
create or replace function public.provision_organization_member(
  target_user_id uuid,
  target_email text,
  target_full_name text,
  target_organization_id uuid,
  target_role public.platform_role,
  target_actor_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_role = 'SUPER_ADMIN' then
    raise exception 'SUPER_ADMIN nao pode ser provisionado por este fluxo';
  end if;

  if not exists (select 1 from public.organizations where id = target_organization_id and active) then
    raise exception 'Organizacao inexistente ou inativa';
  end if;

  insert into public.user_profiles (id, full_name, email)
  values (target_user_id, target_full_name, lower(target_email))
  on conflict (id) do update set full_name = excluded.full_name, email = excluded.email, active = true;

  insert into public.user_roles (user_id, organization_id, role)
  values (target_user_id, target_organization_id, target_role)
  on conflict (user_id, organization_id, role) do nothing;

  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values (
    target_organization_id,
    target_actor_id,
    'USER_INVITED',
    'user_profile',
    target_user_id,
    jsonb_build_object('role', target_role, 'email', lower(target_email)),
    'WEB'
  );
end;
$$;

revoke all on function public.provision_organization_member(uuid, text, text, uuid, public.platform_role, uuid) from public;
grant execute on function public.provision_organization_member(uuid, text, text, uuid, public.platform_role, uuid) to service_role;
