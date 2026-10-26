alter table public.nonconformities add column if not exists effectiveness_result text;
alter table public.nonconformities add column if not exists closed_by uuid references public.user_profiles(id) on delete set null;

drop policy if exists "management reads nonconformities" on public.nonconformities;
create policy "governance reads nonconformities" on public.nonconformities for select to authenticated using (
  public.has_ticket_management_role(organization_id)
  or public.has_organization_role(organization_id, array['AUDITOR']::public.platform_role[])
);

create or replace function public.create_action_plan_from_nonconformity(target_nonconformity_id uuid,target_description text,target_priority smallint,target_due_at timestamptz default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare n public.nonconformities%rowtype; action_id uuid;
begin
  select * into n from public.nonconformities where id=target_nonconformity_id for update;
  if n.id is null or not public.has_organization_role(n.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]) then raise exception 'NC_ACTION_NOT_AUTHORIZED'; end if;
  if n.status='CLOSED' then raise exception 'NC_CLOSED'; end if;
  if length(trim(target_description)) not between 10 and 10000 or target_priority not between 1 and 5 then raise exception 'NC_ACTION_INVALID_INPUT'; end if;
  insert into public.action_plans(organization_id,source_entity_type,source_entity_id,description,priority,due_at,created_by)
  values(n.organization_id,'NONCONFORMITY',n.id,trim(target_description),target_priority,target_due_at,auth.uid()) returning id into action_id;
  insert into public.entity_relationships(organization_id,source_entity_type,source_entity_id,target_entity_type,target_entity_id,relationship_type,reason,created_by)
  values(n.organization_id,'NONCONFORMITY',n.id,'ACTION_PLAN',action_id,'CORRECTED_BY','Plano de ação vinculado à não conformidade.',auth.uid());
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
  values(n.organization_id,auth.uid(),'NONCONFORMITY_ACTION_PLAN_CREATED','action_plan',action_id,jsonb_build_object('nonconformity_id',n.id),'WEB');
  return action_id;
end;
$$;

create or replace function public.update_nonconformity_workflow(target_nonconformity_id uuid,target_status public.nonconformity_status,target_immediate_correction text default null,target_root_cause text default null,target_effectiveness_result text default null)
returns void language plpgsql security definer set search_path=public as $$
declare n public.nonconformities%rowtype; action_count integer; all_actions_effective boolean;
begin
  select * into n from public.nonconformities where id=target_nonconformity_id for update;
  if n.id is null or not public.has_organization_role(n.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]) then raise exception 'NC_NOT_AUTHORIZED'; end if;
  if n.status='CLOSED' then raise exception 'NC_ALREADY_CLOSED'; end if;
  if (n.status='OPEN' and target_status<>'CORRECTION') or (n.status='CORRECTION' and target_status<>'CORRECTIVE_ACTION') or (n.status='CORRECTIVE_ACTION' and target_status<>'EFFECTIVENESS') or (n.status='EFFECTIVENESS' and target_status<>'CLOSED') then raise exception 'NC_INVALID_TRANSITION'; end if;
  if target_status='CORRECTION' and length(trim(target_immediate_correction)) not between 10 and 10000 then raise exception 'NC_CORRECTION_REQUIRED'; end if;
  if target_status='CORRECTIVE_ACTION' and length(trim(target_root_cause)) not between 10 and 10000 then raise exception 'NC_ROOT_CAUSE_REQUIRED'; end if;
  if target_status='EFFECTIVENESS' then
    select count(*),coalesce(bool_and(status='EFFECTIVENESS_VERIFIED'),false) into action_count,all_actions_effective from public.action_plans where source_entity_type='NONCONFORMITY' and source_entity_id=n.id;
    if action_count=0 or not all_actions_effective then raise exception 'NC_ACTION_EFFECTIVENESS_REQUIRED'; end if;
  end if;
  if target_status='CLOSED' and length(trim(target_effectiveness_result)) not between 10 and 10000 then raise exception 'NC_EFFECTIVENESS_RESULT_REQUIRED'; end if;
  update public.nonconformities set status=target_status,
    immediate_correction=case when target_status='CORRECTION' then trim(target_immediate_correction) else immediate_correction end,
    root_cause=case when target_status='CORRECTIVE_ACTION' then trim(target_root_cause) else root_cause end,
    effectiveness_result=case when target_status='CLOSED' then trim(target_effectiveness_result) else effectiveness_result end,
    closed_at=case when target_status='CLOSED' then clock_timestamp() else closed_at end,
    closed_by=case when target_status='CLOSED' then auth.uid() else closed_by end
  where id=n.id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
  values(n.organization_id,auth.uid(),'NONCONFORMITY_STATUS_CHANGED','nonconformity',n.id,jsonb_build_object('status',target_status),'WEB');
end;
$$;

revoke all on function public.create_action_plan_from_nonconformity(uuid,text,smallint,timestamptz) from public;
revoke all on function public.update_nonconformity_workflow(uuid,public.nonconformity_status,text,text,text) from public;
grant execute on function public.create_action_plan_from_nonconformity(uuid,text,smallint,timestamptz) to authenticated;
grant execute on function public.update_nonconformity_workflow(uuid,public.nonconformity_status,text,text,text) to authenticated;
