create type public.collaborator_status as enum ('ACTIVE','INACTIVE');
create type public.organization_unit_type as enum ('COMPANY','DEPARTMENT','COST_CENTER','WORK_SITE');
create table public.collaborators(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,employee_number text not null check(length(trim(employee_number)) between 1 and 100),full_name text not null check(length(trim(full_name)) between 2 and 240),user_profile_id uuid unique references public.user_profiles(id) on delete set null,status public.collaborator_status not null default 'ACTIVE',created_by uuid not null references public.user_profiles(id) on delete restrict,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(organization_id,employee_number)
);
create table public.collaborator_email_aliases(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,collaborator_id uuid not null references public.collaborators(id) on delete restrict,email text not null check(email=lower(trim(email)) and position('@' in email)>1),is_primary boolean not null default false,verified_at timestamptz,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index collaborator_email_alias_unique_active on public.collaborator_email_aliases(organization_id,lower(email)) where active;
create unique index collaborator_primary_email_unique on public.collaborator_email_aliases(collaborator_id) where is_primary and active;
create table public.organization_units(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,unit_type public.organization_unit_type not null,code text not null check(length(trim(code)) between 1 and 100),name text not null check(length(trim(name)) between 2 and 240),active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(organization_id,unit_type,code)
);
create table public.collaborator_assignments(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,collaborator_id uuid not null references public.collaborators(id) on delete restrict,company_unit_id uuid references public.organization_units(id) on delete restrict,department_unit_id uuid references public.organization_units(id) on delete restrict,cost_center_unit_id uuid references public.organization_units(id) on delete restrict,work_site_unit_id uuid references public.organization_units(id) on delete restrict,starts_on date not null,ends_on date,created_by uuid not null references public.user_profiles(id) on delete restrict,created_at timestamptz not null default now(),check(ends_on is null or ends_on >= starts_on)
);
create index collaborators_org_status_idx on public.collaborators(organization_id,status,full_name); create index collaborator_assignments_collaborator_idx on public.collaborator_assignments(collaborator_id,starts_on desc);
create trigger collaborators_updated before update on public.collaborators for each row execute function public.set_updated_at(); create trigger collaborator_email_aliases_updated before update on public.collaborator_email_aliases for each row execute function public.set_updated_at(); create trigger organization_units_updated before update on public.organization_units for each row execute function public.set_updated_at();
create or replace function public.prevent_collaborator_assignment_overlap() returns trigger language plpgsql set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtext(new.collaborator_id::text));
 if exists(select 1 from public.collaborator_assignments a where a.collaborator_id=new.collaborator_id and a.id is distinct from new.id and daterange(a.starts_on,coalesce(a.ends_on,'infinity'::date),'[]') && daterange(new.starts_on,coalesce(new.ends_on,'infinity'::date),'[]')) then raise exception 'COLLABORATOR_ASSIGNMENT_OVERLAP'; end if;
 return new;
end; $$;
create or replace function public.validate_collaborator_assignment_scope() returns trigger language plpgsql set search_path=public as $$
begin
 if not exists(select 1 from public.collaborators c where c.id=new.collaborator_id and c.organization_id=new.organization_id) then raise exception 'COLLABORATOR_ASSIGNMENT_ORGANIZATION_MISMATCH'; end if;
 if new.company_unit_id is not null and not exists(select 1 from public.organization_units u where u.id=new.company_unit_id and u.organization_id=new.organization_id and u.unit_type='COMPANY') then raise exception 'COLLABORATOR_ASSIGNMENT_INVALID_COMPANY'; end if;
 if new.department_unit_id is not null and not exists(select 1 from public.organization_units u where u.id=new.department_unit_id and u.organization_id=new.organization_id and u.unit_type='DEPARTMENT') then raise exception 'COLLABORATOR_ASSIGNMENT_INVALID_DEPARTMENT'; end if;
 if new.cost_center_unit_id is not null and not exists(select 1 from public.organization_units u where u.id=new.cost_center_unit_id and u.organization_id=new.organization_id and u.unit_type='COST_CENTER') then raise exception 'COLLABORATOR_ASSIGNMENT_INVALID_COST_CENTER'; end if;
 if new.work_site_unit_id is not null and not exists(select 1 from public.organization_units u where u.id=new.work_site_unit_id and u.organization_id=new.organization_id and u.unit_type='WORK_SITE') then raise exception 'COLLABORATOR_ASSIGNMENT_INVALID_WORK_SITE'; end if;
 return new;
end; $$;
create trigger collaborator_assignments_validate_scope before insert or update on public.collaborator_assignments for each row execute function public.validate_collaborator_assignment_scope();
create trigger collaborator_assignments_no_overlap before insert or update on public.collaborator_assignments for each row execute function public.prevent_collaborator_assignment_overlap();
alter table public.collaborators enable row level security; alter table public.collaborator_email_aliases enable row level security; alter table public.organization_units enable row level security; alter table public.collaborator_assignments enable row level security;
create policy "governance reads collaborators" on public.collaborators for select to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]));
create policy "governance reads collaborator aliases" on public.collaborator_email_aliases for select to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]));
create policy "governance reads organization units" on public.organization_units for select to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]));
create policy "governance reads collaborator assignments" on public.collaborator_assignments for select to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]));
create or replace function public.create_collaborator(target_organization_id uuid,target_employee_number text,target_full_name text,target_primary_email text default null)
returns uuid language plpgsql security definer set search_path=public as $$ declare collaborator_id uuid; normalized_email text;
begin if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]) then raise exception 'COLLABORATOR_NOT_AUTHORIZED'; end if; if coalesce(length(trim(target_employee_number)),0) not between 1 and 100 or coalesce(length(trim(target_full_name)),0) not between 2 and 240 then raise exception 'COLLABORATOR_INVALID_INPUT'; end if; normalized_email:=nullif(lower(trim(target_primary_email)), ''); if normalized_email is not null and position('@' in normalized_email)<=1 then raise exception 'COLLABORATOR_INVALID_EMAIL'; end if;
insert into public.collaborators(organization_id,employee_number,full_name,created_by) values(target_organization_id,trim(target_employee_number),trim(target_full_name),auth.uid()) returning id into collaborator_id;
if normalized_email is not null then insert into public.collaborator_email_aliases(organization_id,collaborator_id,email,is_primary,verified_at) values(target_organization_id,collaborator_id,normalized_email,true,null); end if;
insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(target_organization_id,auth.uid(),'COLLABORATOR_CREATED','collaborator',collaborator_id,jsonb_build_object('employee_number',trim(target_employee_number),'has_primary_email',normalized_email is not null),'WEB'); return collaborator_id; end; $$;
revoke all on function public.create_collaborator(uuid,text,text,text) from public; grant execute on function public.create_collaborator(uuid,text,text,text) to authenticated;
