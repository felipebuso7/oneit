-- Executada somente pelo servidor com service role, apos autorizar o ator na action.
create or replace function public.revoke_organization_role(
  target_user_id uuid,
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
    raise exception 'SUPER_ADMIN nao pode ser revogado por este fluxo';
  end if;

  if target_user_id = target_actor_id
    and target_role = 'ORG_ADMIN'
    and (select count(*) from public.user_roles where organization_id = target_organization_id and role in ('SUPER_ADMIN', 'ORG_ADMIN')) <= 1 then
    raise exception 'LAST_ORGANIZATION_ADMIN';
  end if;

  delete from public.user_roles
  where user_id = target_user_id
    and organization_id = target_organization_id
    and role = target_role;

  if not found then
    raise exception 'ROLE_NOT_FOUND';
  end if;

  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, before_value, source)
  values (
    target_organization_id,
    target_actor_id,
    'USER_ROLE_REVOKED',
    'user_profile',
    target_user_id,
    jsonb_build_object('role', target_role),
    'WEB'
  );
end;
$$;

revoke all on function public.revoke_organization_role(uuid, uuid, public.platform_role, uuid) from public;
grant execute on function public.revoke_organization_role(uuid, uuid, public.platform_role, uuid) to service_role;
