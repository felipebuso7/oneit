create type public.internal_audit_status as enum ('PLANNED','IN_PROGRESS','COMPLETED');

create sequence public.internal_audit_number_sequence start 1;
create or replace function public.next_internal_audit_number() returns text language plpgsql volatile set search_path=public as $$
begin return format('AUD-%s-%s',to_char(current_date,'YYYY'),lpad(nextval('public.internal_audit_number_sequence')::text,6,'0')); end;
$$;

create table public.internal_audits(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  audit_number text not null unique default public.next_internal_audit_number(),
  title text not null check(length(trim(title)) between 5 and 240),
  scope text not null check(length(trim(scope)) between 10 and 10000),
  criteria text not null check(length(trim(criteria)) between 3 and 10000),
  planned_at timestamptz,
  performed_at timestamptz,
  status public.internal_audit_status not null default 'PLANNED',
  lead_auditor_id uuid not null references public.user_profiles(id) on delete restrict,
  created_by uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index internal_audits_org_status_idx on public.internal_audits(organization_id,status,planned_at);
create trigger internal_audits_updated before update on public.internal_audits for each row execute function public.set_updated_at();

create table public.internal_audit_findings(
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.internal_audits(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  finding_type public.nonconformity_type not null,
  requirement_reference text,
  description text not null check(length(trim(description)) between 10 and 10000),
  evidence text check(evidence is null or length(trim(evidence)) between 3 and 10000),
  nonconformity_id uuid unique references public.nonconformities(id) on delete restrict,
  created_by uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index internal_audit_findings_audit_idx on public.internal_audit_findings(audit_id,created_at);

alter table public.internal_audits enable row level security;
alter table public.internal_audit_findings enable row level security;
create policy "governance reads internal audits" on public.internal_audits for select to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]));
create policy "governance reads audit findings" on public.internal_audit_findings for select to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]));

create or replace function public.create_internal_audit(target_organization_id uuid,target_title text,target_scope text,target_criteria text,target_planned_at timestamptz default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare audit_id uuid;
begin
  if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]) then raise exception 'AUDIT_NOT_AUTHORIZED'; end if;
  if length(trim(target_title)) not between 5 and 240 or length(trim(target_scope)) not between 10 and 10000 or length(trim(target_criteria)) not between 3 and 10000 then raise exception 'AUDIT_INVALID_INPUT'; end if;
  insert into public.internal_audits(organization_id,title,scope,criteria,planned_at,lead_auditor_id,created_by) values(target_organization_id,trim(target_title),trim(target_scope),trim(target_criteria),target_planned_at,auth.uid(),auth.uid()) returning id into audit_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(target_organization_id,auth.uid(),'INTERNAL_AUDIT_CREATED','internal_audit',audit_id,jsonb_build_object('planned_at',target_planned_at),'WEB');
  return audit_id;
end;
$$;

create or replace function public.create_internal_audit_finding(target_audit_id uuid,target_type public.nonconformity_type,target_requirement text,target_description text,target_evidence text default null,target_create_nonconformity boolean default false)
returns uuid language plpgsql security definer set search_path=public as $$
declare a public.internal_audits%rowtype; finding_id uuid; nc_id uuid;
begin
  select * into a from public.internal_audits where id=target_audit_id for update;
  if a.id is null or not public.has_organization_role(a.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]) then raise exception 'AUDIT_FINDING_NOT_AUTHORIZED'; end if;
  if a.status='COMPLETED' then raise exception 'AUDIT_COMPLETED'; end if;
  if length(trim(target_description)) not between 10 and 10000 or (target_evidence is not null and length(trim(target_evidence)) not between 3 and 10000) then raise exception 'AUDIT_FINDING_INVALID_INPUT'; end if;
  if target_create_nonconformity and target_type<>'NONCONFORMITY' then raise exception 'AUDIT_FINDING_NC_TYPE_REQUIRED'; end if;
  if target_create_nonconformity then
    insert into public.nonconformities(organization_id,record_type,requirement_reference,description,created_by) values(a.organization_id,'NONCONFORMITY',nullif(trim(target_requirement),''),trim(target_description),auth.uid()) returning id into nc_id;
  end if;
  insert into public.internal_audit_findings(audit_id,organization_id,finding_type,requirement_reference,description,evidence,nonconformity_id,created_by) values(a.id,a.organization_id,target_type,nullif(trim(target_requirement),''),trim(target_description),nullif(trim(target_evidence),''),nc_id,auth.uid()) returning id into finding_id;
  if nc_id is not null then insert into public.entity_relationships(organization_id,source_entity_type,source_entity_id,target_entity_type,target_entity_id,relationship_type,reason,created_by) values(a.organization_id,'INTERNAL_AUDIT',a.id,'NONCONFORMITY',nc_id,'IDENTIFIED','Não conformidade identificada em auditoria interna.',auth.uid()); end if;
  update public.internal_audits set status='IN_PROGRESS',performed_at=coalesce(performed_at,clock_timestamp()) where id=a.id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(a.organization_id,auth.uid(),'INTERNAL_AUDIT_FINDING_CREATED','internal_audit_finding',finding_id,jsonb_build_object('audit_id',a.id,'type',target_type,'nonconformity_id',nc_id),'WEB');
  return finding_id;
end;
$$;

create or replace function public.complete_internal_audit(target_audit_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare a public.internal_audits%rowtype;
begin
  select * into a from public.internal_audits where id=target_audit_id for update;
  if a.id is null or not public.has_organization_role(a.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]) then raise exception 'AUDIT_NOT_AUTHORIZED'; end if;
  if a.status='COMPLETED' then raise exception 'AUDIT_ALREADY_COMPLETED'; end if;
  update public.internal_audits set status='COMPLETED',performed_at=coalesce(performed_at,clock_timestamp()),completed_at=clock_timestamp() where id=a.id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(a.organization_id,auth.uid(),'INTERNAL_AUDIT_COMPLETED','internal_audit',a.id,jsonb_build_object('status','COMPLETED'),'WEB');
end;
$$;

revoke all on function public.create_internal_audit(uuid,text,text,text,timestamptz) from public;
revoke all on function public.create_internal_audit_finding(uuid,public.nonconformity_type,text,text,text,boolean) from public;
revoke all on function public.complete_internal_audit(uuid) from public;
grant execute on function public.create_internal_audit(uuid,text,text,text,timestamptz) to authenticated;
grant execute on function public.create_internal_audit_finding(uuid,public.nonconformity_type,text,text,text,boolean) to authenticated;
grant execute on function public.complete_internal_audit(uuid) to authenticated;
