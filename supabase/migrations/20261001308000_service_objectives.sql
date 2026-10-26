create type public.service_objective_direction as enum ('AT_LEAST','AT_MOST');
create type public.service_objective_status as enum ('ACTIVE','ACHIEVED','NOT_ACHIEVED','CANCELLED');
create sequence public.service_objective_number_sequence start 1;
create or replace function public.next_service_objective_number() returns text language plpgsql volatile set search_path=public as $$ begin return format('OBJ-%s-%s',to_char(current_date,'YYYY'),lpad(nextval('public.service_objective_number_sequence')::text,6,'0')); end; $$;

create table public.service_objectives(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,objective_number text not null unique default public.next_service_objective_number(),title text not null check(length(trim(title)) between 5 and 240),metric_definition text not null check(length(trim(metric_definition)) between 10 and 10000),unit text not null check(length(trim(unit)) between 1 and 50),baseline numeric(14,4),target numeric(14,4) not null,direction public.service_objective_direction not null,period_start date not null,period_end date not null check(period_end > period_start),status public.service_objective_status not null default 'ACTIVE',actual numeric(14,4),evaluation_evidence text,evaluated_at timestamptz,evaluated_by uuid references public.user_profiles(id) on delete set null,owner_id uuid references public.user_profiles(id) on delete set null,created_by uuid not null references public.user_profiles(id) on delete restrict,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(evaluation_evidence is null or length(trim(evaluation_evidence)) between 10 and 10000)
);
create index service_objectives_org_status_period_idx on public.service_objectives(organization_id,status,period_end);
create trigger service_objectives_updated before update on public.service_objectives for each row execute function public.set_updated_at();
alter table public.service_objectives enable row level security;
create policy "governance reads service objectives" on public.service_objectives for select to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]));

create or replace function public.create_service_objective(target_organization_id uuid,target_title text,target_definition text,target_unit text,target_baseline numeric,target_target numeric,target_direction public.service_objective_direction,target_start date,target_end date)
returns uuid language plpgsql security definer set search_path=public as $$ declare objective_id uuid;
begin
 if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]) then raise exception 'OBJECTIVE_NOT_AUTHORIZED'; end if;
 if length(trim(target_title)) not between 5 and 240 or length(trim(target_definition)) not between 10 and 10000 or length(trim(target_unit)) not between 1 and 50 or target_target is null or target_start is null or target_end is null or target_end <= target_start then raise exception 'OBJECTIVE_INVALID_INPUT'; end if;
 insert into public.service_objectives(organization_id,title,metric_definition,unit,baseline,target,direction,period_start,period_end,owner_id,created_by) values(target_organization_id,trim(target_title),trim(target_definition),trim(target_unit),target_baseline,target_target,target_direction,target_start,target_end,auth.uid(),auth.uid()) returning id into objective_id;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(target_organization_id,auth.uid(),'SERVICE_OBJECTIVE_CREATED','service_objective',objective_id,jsonb_build_object('target',target_target,'direction',target_direction,'period_end',target_end),'WEB'); return objective_id;
end; $$;

create or replace function public.evaluate_service_objective(target_objective_id uuid,target_actual numeric,target_evidence text)
returns void language plpgsql security definer set search_path=public as $$ declare objective public.service_objectives%rowtype; outcome public.service_objective_status;
begin
 select * into objective from public.service_objectives where id=target_objective_id for update;
 if objective.id is null or not public.has_organization_role(objective.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]) then raise exception 'OBJECTIVE_NOT_AUTHORIZED'; end if;
 if objective.status <> 'ACTIVE' then raise exception 'OBJECTIVE_NOT_ACTIVE'; end if;
 if target_actual is null or coalesce(length(trim(target_evidence)),0) not between 10 and 10000 then raise exception 'OBJECTIVE_EVALUATION_INVALID'; end if;
 outcome := case when (objective.direction='AT_LEAST' and target_actual >= objective.target) or (objective.direction='AT_MOST' and target_actual <= objective.target) then 'ACHIEVED' else 'NOT_ACHIEVED' end;
 update public.service_objectives set actual=target_actual,evaluation_evidence=trim(target_evidence),status=outcome,evaluated_at=clock_timestamp(),evaluated_by=auth.uid() where id=objective.id;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(objective.organization_id,auth.uid(),'SERVICE_OBJECTIVE_EVALUATED','service_objective',objective.id,jsonb_build_object('actual',target_actual,'status',outcome),'WEB');
end; $$;
revoke all on function public.create_service_objective(uuid,text,text,text,numeric,numeric,public.service_objective_direction,date,date) from public; revoke all on function public.evaluate_service_objective(uuid,numeric,text) from public;
grant execute on function public.create_service_objective(uuid,text,text,text,numeric,numeric,public.service_objective_direction,date,date) to authenticated; grant execute on function public.evaluate_service_objective(uuid,numeric,text) to authenticated;
