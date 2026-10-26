create table public.sgsti_initiatives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null check(code ~ '^MEL-[0-9]{2}$'),
  title text not null check(length(trim(title)) between 5 and 240),
  description text,
  priority text not null check(priority in ('CRITICAL','HIGH','MEDIUM','LOW')),
  iso_references text[] not null check(cardinality(iso_references) between 1 and 20),
  owner_id uuid references public.user_profiles(id) on delete set null,
  due_at timestamptz,
  status text not null default 'PLANNED' check(status in ('PLANNED','IN_PROGRESS','UNDER_REVIEW','COMPLETED','BLOCKED','CANCELLED')),
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, code)
);

create table public.sgsti_initiative_tasks (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.sgsti_initiatives(id) on delete cascade,
  code text not null check(code ~ '^MEL-[0-9]{2}\.[0-9]{2}$'),
  title text not null check(length(trim(title)) between 5 and 500),
  acceptance_criteria text not null check(length(trim(acceptance_criteria)) between 10 and 10000),
  expected_evidence text not null check(length(trim(expected_evidence)) between 3 and 10000),
  owner_id uuid references public.user_profiles(id) on delete set null,
  due_at timestamptz,
  status text not null default 'PLANNED' check(status in ('PLANNED','IN_PROGRESS','AWAITING_EVIDENCE','UNDER_REVIEW','COMPLETED','EFFECTIVENESS_VERIFIED','BLOCKED','CANCELLED')),
  execution_summary text,
  blocker_reason text,
  completed_at timestamptz,
  completed_by uuid references public.user_profiles(id) on delete set null,
  effectiveness_summary text,
  effectiveness_verified_at timestamptz,
  effectiveness_verified_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(initiative_id, code)
);

create table public.sgsti_initiative_task_evidences (
  task_id uuid not null references public.sgsti_initiative_tasks(id) on delete cascade,
  evidence_id uuid not null references public.sgsti_evidences(id) on delete restrict,
  linked_by uuid references public.user_profiles(id) on delete set null,
  linked_at timestamptz not null default now(),
  primary key(task_id, evidence_id)
);

create table public.sgsti_initiative_task_actions (
  task_id uuid not null references public.sgsti_initiative_tasks(id) on delete cascade,
  action_plan_id uuid not null unique references public.action_plans(id) on delete restrict,
  action_kind text not null check(action_kind in ('CORRECTION','CORRECTIVE_ACTION','IMPROVEMENT','PREVENTIVE_ACTION','RISK_TREATMENT')),
  linked_by uuid references public.user_profiles(id) on delete set null,
  linked_at timestamptz not null default now(),
  primary key(task_id, action_plan_id)
);

create index sgsti_initiatives_org_status_due_idx on public.sgsti_initiatives(organization_id, status, due_at);
create index sgsti_initiative_tasks_initiative_status_due_idx on public.sgsti_initiative_tasks(initiative_id, status, due_at);
create index sgsti_task_actions_action_idx on public.sgsti_initiative_task_actions(action_plan_id);

create trigger sgsti_initiatives_updated before update on public.sgsti_initiatives for each row execute function public.set_updated_at();
create trigger sgsti_initiative_tasks_updated before update on public.sgsti_initiative_tasks for each row execute function public.set_updated_at();

alter table public.sgsti_initiatives enable row level security;
alter table public.sgsti_initiative_tasks enable row level security;
alter table public.sgsti_initiative_task_evidences enable row level security;
alter table public.sgsti_initiative_task_actions enable row level security;

create policy "members read sgsti initiatives" on public.sgsti_initiatives for select to authenticated using(public.is_organization_member(organization_id));
create policy "governance manages sgsti initiatives" on public.sgsti_initiatives for all to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[])) with check(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]));

create policy "members read sgsti initiative tasks" on public.sgsti_initiative_tasks for select to authenticated using(exists(select 1 from public.sgsti_initiatives i where i.id=initiative_id and public.is_organization_member(i.organization_id)));
create policy "governance manages sgsti initiative tasks" on public.sgsti_initiative_tasks for all to authenticated using(exists(select 1 from public.sgsti_initiatives i where i.id=initiative_id and public.has_organization_role(i.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]))) with check(exists(select 1 from public.sgsti_initiatives i where i.id=initiative_id and public.has_organization_role(i.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[])));

create policy "members read sgsti task evidence links" on public.sgsti_initiative_task_evidences for select to authenticated using(exists(select 1 from public.sgsti_initiative_tasks t join public.sgsti_initiatives i on i.id=t.initiative_id where t.id=task_id and public.is_organization_member(i.organization_id)));
create policy "governance manages sgsti task evidence links" on public.sgsti_initiative_task_evidences for all to authenticated using(exists(select 1 from public.sgsti_initiative_tasks t join public.sgsti_initiatives i on i.id=t.initiative_id where t.id=task_id and public.has_organization_role(i.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]))) with check(exists(select 1 from public.sgsti_initiative_tasks t join public.sgsti_initiatives i on i.id=t.initiative_id where t.id=task_id and public.has_organization_role(i.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[])));

create policy "members read sgsti task action links" on public.sgsti_initiative_task_actions for select to authenticated using(exists(select 1 from public.sgsti_initiative_tasks t join public.sgsti_initiatives i on i.id=t.initiative_id where t.id=task_id and public.is_organization_member(i.organization_id)));
create policy "governance manages sgsti task action links" on public.sgsti_initiative_task_actions for all to authenticated using(exists(select 1 from public.sgsti_initiative_tasks t join public.sgsti_initiatives i on i.id=t.initiative_id where t.id=task_id and public.has_organization_role(i.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]))) with check(exists(select 1 from public.sgsti_initiative_tasks t join public.sgsti_initiatives i on i.id=t.initiative_id where t.id=task_id and public.has_organization_role(i.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[])));

create or replace function public.create_sgsti_task_action_plan(
  target_task_id uuid,
  target_action_kind text,
  target_description text,
  target_priority smallint,
  target_owner_id uuid default null,
  target_due_at timestamptz default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare task_record public.sgsti_initiative_tasks%rowtype; org_id uuid; action_id uuid;
begin
  select * into task_record from public.sgsti_initiative_tasks where id=target_task_id for update;
  select organization_id into org_id from public.sgsti_initiatives where id=task_record.initiative_id;
  if task_record.id is null or not public.has_organization_role(org_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]) then raise exception 'SGSTI_TASK_ACTION_NOT_AUTHORIZED'; end if;
  if target_action_kind not in ('CORRECTION','CORRECTIVE_ACTION','IMPROVEMENT','PREVENTIVE_ACTION','RISK_TREATMENT') or length(trim(target_description)) not between 10 and 10000 or target_priority not between 1 and 5 then raise exception 'SGSTI_TASK_ACTION_INVALID_INPUT'; end if;
  insert into public.action_plans(organization_id,source_entity_type,source_entity_id,description,owner_id,due_at,priority,created_by)
    values(org_id,'SGSTI_INITIATIVE_TASK',task_record.id,trim(target_description),target_owner_id,target_due_at,target_priority,auth.uid()) returning id into action_id;
  insert into public.sgsti_initiative_task_actions(task_id,action_plan_id,action_kind,linked_by) values(task_record.id,action_id,target_action_kind,auth.uid());
  insert into public.entity_relationships(organization_id,source_entity_type,source_entity_id,target_entity_type,target_entity_id,relationship_type,reason,created_by)
    values(org_id,'SGSTI_INITIATIVE_TASK',task_record.id,'ACTION_PLAN',action_id,'TRACKED_BY','Plano de ação criado a partir de tarefa SGSTI.',auth.uid());
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
    values(org_id,auth.uid(),'SGSTI_TASK_ACTION_PLAN_CREATED','action_plan',action_id,jsonb_build_object('task_id',task_record.id,'action_kind',target_action_kind),'WEB');
  return action_id;
end;
$$;

create or replace function public.update_sgsti_initiative_task_execution(
  target_task_id uuid,
  target_status text,
  target_execution_summary text default null,
  target_blocker_reason text default null,
  target_effectiveness_summary text default null
) returns void language plpgsql security definer set search_path=public as $$
declare task_record public.sgsti_initiative_tasks%rowtype; org_id uuid; evidence_count integer;
begin
  select * into task_record from public.sgsti_initiative_tasks where id=target_task_id for update;
  select organization_id into org_id from public.sgsti_initiatives where id=task_record.initiative_id;
  if task_record.id is null or not public.has_organization_role(org_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]) then raise exception 'SGSTI_TASK_NOT_AUTHORIZED'; end if;
  if target_status not in ('PLANNED','IN_PROGRESS','AWAITING_EVIDENCE','UNDER_REVIEW','COMPLETED','EFFECTIVENESS_VERIFIED','BLOCKED','CANCELLED') then raise exception 'SGSTI_TASK_INVALID_STATUS'; end if;
  select count(*) into evidence_count from public.sgsti_initiative_task_evidences where task_id=task_record.id;
  if target_status in ('UNDER_REVIEW','COMPLETED','EFFECTIVENESS_VERIFIED') and evidence_count=0 then raise exception 'SGSTI_TASK_EVIDENCE_REQUIRED'; end if;
  if target_status in ('COMPLETED','EFFECTIVENESS_VERIFIED') and length(trim(target_execution_summary)) not between 10 and 10000 then raise exception 'SGSTI_TASK_EXECUTION_REQUIRED'; end if;
  if target_status='BLOCKED' and length(trim(target_blocker_reason)) not between 10 and 5000 then raise exception 'SGSTI_TASK_BLOCKER_REQUIRED'; end if;
  if target_status='EFFECTIVENESS_VERIFIED' and length(trim(target_effectiveness_summary)) not between 10 and 10000 then raise exception 'SGSTI_TASK_EFFECTIVENESS_REQUIRED'; end if;
  update public.sgsti_initiative_tasks set status=target_status, execution_summary=coalesce(nullif(trim(target_execution_summary),''),execution_summary), blocker_reason=case when target_status='BLOCKED' then trim(target_blocker_reason) else blocker_reason end, completed_at=case when target_status='COMPLETED' then now() else completed_at end, completed_by=case when target_status='COMPLETED' then auth.uid() else completed_by end, effectiveness_summary=case when target_status='EFFECTIVENESS_VERIFIED' then trim(target_effectiveness_summary) else effectiveness_summary end, effectiveness_verified_at=case when target_status='EFFECTIVENESS_VERIFIED' then now() else effectiveness_verified_at end, effectiveness_verified_by=case when target_status='EFFECTIVENESS_VERIFIED' then auth.uid() else effectiveness_verified_by end where id=task_record.id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(org_id,auth.uid(),'SGSTI_INITIATIVE_TASK_UPDATED','sgsti_initiative_task',task_record.id,jsonb_build_object('status',target_status),'WEB');
end;
$$;

revoke all on function public.create_sgsti_task_action_plan(uuid,text,text,smallint,uuid,timestamptz) from public;
revoke all on function public.update_sgsti_initiative_task_execution(uuid,text,text,text,text) from public;
grant execute on function public.create_sgsti_task_action_plan(uuid,text,text,smallint,uuid,timestamptz) to authenticated;
grant execute on function public.update_sgsti_initiative_task_execution(uuid,text,text,text,text) to authenticated;
