-- Alters a member role atomically, preserving at least one organization administrator.
create or replace function public.change_organization_member_role(
  target_user_id uuid,
  target_organization_id uuid,
  "current_role" public.platform_role,
  target_role public.platform_role,
  target_actor_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if "current_role" = 'SUPER_ADMIN' or target_role = 'SUPER_ADMIN' then
    raise exception 'SUPER_ADMIN cannot be changed by this flow';
  end if;

  if "current_role" = target_role then
    raise exception 'Role did not change';
  end if;

  if not exists (
    select 1 from public.user_roles
    where user_id = target_user_id and organization_id = target_organization_id and role = "current_role"
  ) then
    raise exception 'Member role does not exist';
  end if;

  if "current_role" = 'ORG_ADMIN' and not exists (
    select 1 from public.user_roles
    where organization_id = target_organization_id
      and role in ('SUPER_ADMIN', 'ORG_ADMIN')
      and (user_id <> target_user_id or role <> "current_role")
  ) then
    raise exception 'Last organization administrator cannot be changed';
  end if;

  delete from public.user_roles
  where user_id = target_user_id and organization_id = target_organization_id and role = "current_role";

  insert into public.user_roles (user_id, organization_id, role)
  values (target_user_id, target_organization_id, target_role)
  on conflict (user_id, organization_id, role) do nothing;

  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, before_value, after_value, source)
  values (
    target_organization_id, target_actor_id, 'USER_ROLE_CHANGED', 'user_profile', target_user_id,
    jsonb_build_object('role', "current_role"), jsonb_build_object('role', target_role), 'WEB'
  );
end;
$$;

revoke all on function public.change_organization_member_role(uuid, uuid, public.platform_role, public.platform_role, uuid) from public;
grant execute on function public.change_organization_member_role(uuid, uuid, public.platform_role, public.platform_role, uuid) to service_role;
