-- SGSTI-specific roles preserve segregation of duties without broadening the
-- platform role granted to a person in other operational modules.
create type public.sgsti_role as enum ('AUTHOR','REVIEWER','APPROVER','AUDITOR');

create table public.sgsti_user_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  role public.sgsti_role not null,
  granted_by uuid references public.user_profiles(id) on delete set null,
  granted_at timestamptz not null default clock_timestamp(),
  unique(organization_id, user_id, role)
);

create index sgsti_user_roles_lookup_idx on public.sgsti_user_roles(organization_id,user_id,role);
alter table public.sgsti_user_roles enable row level security;

create or replace function public.has_sgsti_role(target_organization_id uuid, allowed_roles public.sgsti_role[])
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.sgsti_user_roles where organization_id=target_organization_id and user_id=auth.uid() and role=any(allowed_roles));
$$;

create or replace function public.has_sgsti_management_access(target_organization_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[])
      or public.has_sgsti_role(target_organization_id,array['AUTHOR','REVIEWER','APPROVER']::public.sgsti_role[]);
$$;

create or replace function public.has_sgsti_approval_access(target_organization_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[])
      or public.has_sgsti_role(target_organization_id,array['APPROVER']::public.sgsti_role[]);
$$;

create policy "sgsti users read own roles" on public.sgsti_user_roles for select to authenticated
  using(user_id=auth.uid() or public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
create policy "sgsti administrators manage roles" on public.sgsti_user_roles for all to authenticated
  using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]))
  with check(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));

create or replace function public.grant_sgsti_role(target_organization_id uuid,target_user_id uuid,target_role public.sgsti_role)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then raise exception 'SGSTI_ROLE_MANAGEMENT_DENIED'; end if;
  if not exists(select 1 from public.user_roles where organization_id=target_organization_id and user_id=target_user_id) then raise exception 'SGSTI_ROLE_USER_NOT_MEMBER'; end if;
  insert into public.sgsti_user_roles(organization_id,user_id,role,granted_by) values(target_organization_id,target_user_id,target_role,auth.uid()) on conflict do nothing;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
    values(target_organization_id,auth.uid(),'SGSTI_ROLE_GRANTED','sgsti_user_role',null,jsonb_build_object('user_id',target_user_id,'role',target_role),'WEB');
end;
$$;

create or replace function public.revoke_sgsti_role(target_organization_id uuid,target_user_id uuid,target_role public.sgsti_role)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then raise exception 'SGSTI_ROLE_MANAGEMENT_DENIED'; end if;
  delete from public.sgsti_user_roles where organization_id=target_organization_id and user_id=target_user_id and role=target_role;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
    values(target_organization_id,auth.uid(),'SGSTI_ROLE_REVOKED','sgsti_user_role',null,jsonb_build_object('user_id',target_user_id,'role',target_role),'WEB');
end;
$$;

revoke all on function public.has_sgsti_role(uuid,public.sgsti_role[]),public.has_sgsti_management_access(uuid),public.has_sgsti_approval_access(uuid),public.grant_sgsti_role(uuid,uuid,public.sgsti_role),public.revoke_sgsti_role(uuid,uuid,public.sgsti_role) from public;
grant execute on function public.has_sgsti_role(uuid,public.sgsti_role[]),public.has_sgsti_management_access(uuid),public.has_sgsti_approval_access(uuid),public.grant_sgsti_role(uuid,uuid,public.sgsti_role),public.revoke_sgsti_role(uuid,uuid,public.sgsti_role) to authenticated;
