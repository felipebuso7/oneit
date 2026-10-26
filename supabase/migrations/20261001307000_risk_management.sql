create type public.risk_status as enum ('ASSESSED','TREATMENT','ACCEPTED','CLOSED');
create type public.risk_treatment as enum ('MITIGATE','TRANSFER','AVOID','ACCEPT');
create sequence public.risk_number_sequence start 1;
create or replace function public.next_risk_number() returns text language plpgsql volatile set search_path=public as $$ begin return format('RSK-%s-%s',to_char(current_date,'YYYY'),lpad(nextval('public.risk_number_sequence')::text,6,'0')); end; $$;

create table public.risks(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,risk_number text not null unique default public.next_risk_number(),title text not null check(length(trim(title)) between 5 and 240),description text not null check(length(trim(description)) between 10 and 10000),likelihood smallint not null check(likelihood between 1 and 5),impact smallint not null check(impact between 1 and 5),inherent_score smallint generated always as (likelihood * impact) stored,status public.risk_status not null default 'ASSESSED',treatment public.risk_treatment,treatment_plan text,treatment_result text,residual_likelihood smallint check(residual_likelihood between 1 and 5),residual_impact smallint check(residual_impact between 1 and 5),residual_score smallint generated always as (residual_likelihood * residual_impact) stored,acceptance_justification text,owner_id uuid references public.user_profiles(id) on delete set null,created_by uuid not null references public.user_profiles(id) on delete restrict,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),closed_at timestamptz,closed_by uuid references public.user_profiles(id) on delete set null
);
create index risks_org_status_idx on public.risks(organization_id,status,inherent_score desc);
create trigger risks_updated before update on public.risks for each row execute function public.set_updated_at();
alter table public.risks enable row level security;
create policy "governance reads risks" on public.risks for select to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]));

create or replace function public.create_risk(target_organization_id uuid,target_title text,target_description text,target_likelihood smallint,target_impact smallint)
returns uuid language plpgsql security definer set search_path=public as $$ declare risk_id uuid;
begin
 if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]) then raise exception 'RISK_NOT_AUTHORIZED'; end if;
 if length(trim(target_title)) not between 5 and 240 or length(trim(target_description)) not between 10 and 10000 or target_likelihood not between 1 and 5 or target_impact not between 1 and 5 then raise exception 'RISK_INVALID_INPUT'; end if;
 insert into public.risks(organization_id,title,description,likelihood,impact,owner_id,created_by) values(target_organization_id,trim(target_title),trim(target_description),target_likelihood,target_impact,auth.uid(),auth.uid()) returning id into risk_id;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(target_organization_id,auth.uid(),'RISK_CREATED','risk',risk_id,jsonb_build_object('likelihood',target_likelihood,'impact',target_impact),'WEB'); return risk_id;
end; $$;

create or replace function public.update_risk_workflow(target_risk_id uuid,target_status public.risk_status,target_treatment public.risk_treatment default null,target_treatment_plan text default null,target_treatment_result text default null,target_residual_likelihood smallint default null,target_residual_impact smallint default null,target_acceptance_justification text default null)
returns void language plpgsql security definer set search_path=public as $$ declare r public.risks%rowtype;
begin
 select * into r from public.risks where id=target_risk_id for update;
 if r.id is null or not public.has_organization_role(r.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]) then raise exception 'RISK_NOT_AUTHORIZED'; end if;
 if r.status='CLOSED' then raise exception 'RISK_ALREADY_CLOSED'; end if;
 if (r.status='ASSESSED' and target_status<>'TREATMENT') or (r.status='TREATMENT' and target_status<>'ACCEPTED') or (r.status='ACCEPTED' and target_status<>'CLOSED') then raise exception 'RISK_INVALID_TRANSITION'; end if;
 if target_status='TREATMENT' and (target_treatment is null or coalesce(length(trim(target_treatment_plan)),0) not between 10 and 10000) then raise exception 'RISK_TREATMENT_REQUIRED'; end if;
 if target_status='ACCEPTED' and (coalesce(length(trim(target_treatment_result)),0) not between 10 and 10000 or target_residual_likelihood not between 1 and 5 or target_residual_impact not between 1 and 5 or coalesce(length(trim(target_acceptance_justification)),0) not between 10 and 10000) then raise exception 'RISK_ACCEPTANCE_REQUIRED'; end if;
 if target_status='CLOSED' and coalesce(length(trim(target_treatment_result)),0) not between 10 and 10000 then raise exception 'RISK_CLOSURE_EVIDENCE_REQUIRED'; end if;
 update public.risks set status=target_status,treatment=case when target_status='TREATMENT' then target_treatment else treatment end,treatment_plan=case when target_status='TREATMENT' then trim(target_treatment_plan) else treatment_plan end,treatment_result=case when target_status in ('ACCEPTED','CLOSED') then trim(target_treatment_result) else treatment_result end,residual_likelihood=case when target_status='ACCEPTED' then target_residual_likelihood else residual_likelihood end,residual_impact=case when target_status='ACCEPTED' then target_residual_impact else residual_impact end,acceptance_justification=case when target_status='ACCEPTED' then trim(target_acceptance_justification) else acceptance_justification end,closed_at=case when target_status='CLOSED' then clock_timestamp() else closed_at end,closed_by=case when target_status='CLOSED' then auth.uid() else closed_by end where id=r.id;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(r.organization_id,auth.uid(),'RISK_STATUS_CHANGED','risk',r.id,jsonb_build_object('status',target_status),'WEB');
end; $$;
revoke all on function public.create_risk(uuid,text,text,smallint,smallint) from public; revoke all on function public.update_risk_workflow(uuid,public.risk_status,public.risk_treatment,text,text,smallint,smallint,text) from public;
grant execute on function public.create_risk(uuid,text,text,smallint,smallint) to authenticated; grant execute on function public.update_risk_workflow(uuid,public.risk_status,public.risk_treatment,text,text,smallint,smallint,text) to authenticated;
