create table public.sgsti_assurance_request_actions(
 request_id uuid not null references public.sgsti_assurance_requests(id) on delete cascade,
 action_plan_id uuid not null unique references public.action_plans(id) on delete restrict,
 action_kind text not null check(action_kind in ('CORRECTION','CORRECTIVE_ACTION','IMPROVEMENT','PREVENTIVE_ACTION','RISK_TREATMENT')),
 linked_by uuid references public.user_profiles(id) on delete set null,
 linked_at timestamptz not null default now(),
 primary key(request_id,action_plan_id)
);
create index sgsti_assurance_request_actions_request_idx on public.sgsti_assurance_request_actions(request_id);
alter table public.sgsti_assurance_request_actions enable row level security;
create policy "members read assurance action links" on public.sgsti_assurance_request_actions for select to authenticated using(exists(select 1 from public.sgsti_assurance_requests request where request.id=request_id and public.is_organization_member(request.organization_id)));

create or replace function public.create_sgsti_assurance_action_plan(
 target_request_id uuid,
 target_action_kind text,
 target_description text,
 target_priority smallint,
 target_owner_id uuid default null,
 target_due_at timestamptz default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare request_record public.sgsti_assurance_requests%rowtype; action_id uuid; owner_id uuid;
begin
 select * into request_record from public.sgsti_assurance_requests where id=target_request_id for update;
 if request_record.id is null or not public.has_sgsti_management_access(request_record.organization_id) then raise exception 'SGSTI_ASSURANCE_ACTION_NOT_AUTHORIZED'; end if;
 if request_record.status not in ('RETURNED','OVERDUE') then raise exception 'SGSTI_ASSURANCE_ACTION_STATUS_INVALID'; end if;
 if target_action_kind not in ('CORRECTION','CORRECTIVE_ACTION','IMPROVEMENT','PREVENTIVE_ACTION','RISK_TREATMENT') or coalesce(length(trim(target_description)),0) not between 10 and 10000 or target_priority not between 1 and 5 then raise exception 'SGSTI_ASSURANCE_ACTION_INVALID_INPUT'; end if;
 owner_id:=coalesce(target_owner_id,request_record.responsible_id);
 if not exists(select 1 from public.user_roles where organization_id=request_record.organization_id and user_id=owner_id) then raise exception 'SGSTI_ASSURANCE_ACTION_OWNER_NOT_MEMBER'; end if;
 insert into public.action_plans(organization_id,source_entity_type,source_entity_id,description,owner_id,due_at,priority,created_by)
 values(request_record.organization_id,'SGSTI_ASSURANCE_REQUEST',request_record.id,trim(target_description),owner_id,target_due_at,target_priority,auth.uid()) returning id into action_id;
 insert into public.sgsti_assurance_request_actions(request_id,action_plan_id,action_kind,linked_by) values(request_record.id,action_id,target_action_kind,auth.uid());
 insert into public.entity_relationships(organization_id,source_entity_type,source_entity_id,target_entity_type,target_entity_id,relationship_type,reason,created_by)
 values(request_record.organization_id,'SGSTI_ASSURANCE_REQUEST',request_record.id,'ACTION_PLAN',action_id,'CORRECTED_BY','Plano de ação criado a partir de pedido de evidência SGSTI.',auth.uid());
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
 values(request_record.organization_id,auth.uid(),'SGSTI_ASSURANCE_ACTION_PLAN_CREATED','action_plan',action_id,jsonb_build_object('request_id',request_record.id,'action_kind',target_action_kind),'WEB');
 return action_id;
end;
$$;
revoke all on function public.create_sgsti_assurance_action_plan(uuid,text,text,smallint,uuid,timestamptz) from public;
grant execute on function public.create_sgsti_assurance_action_plan(uuid,text,text,smallint,uuid,timestamptz) to authenticated;
