-- Corrige casts explícitos apontados pelo lint remoto.

create or replace function public.evaluate_service_objective(target_objective_id uuid,target_actual numeric,target_evidence text)
returns void language plpgsql security definer set search_path=public as $$
declare objective public.service_objectives%rowtype; outcome public.service_objective_status;
begin
  select * into objective from public.service_objectives where id=target_objective_id for update;
  if objective.id is null or not public.has_organization_role(objective.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]) then raise exception 'OBJECTIVE_NOT_AUTHORIZED'; end if;
  if objective.status <> 'ACTIVE' then raise exception 'OBJECTIVE_NOT_ACTIVE'; end if;
  if target_actual is null or coalesce(length(trim(target_evidence)),0) not between 10 and 10000 then raise exception 'OBJECTIVE_EVALUATION_INVALID'; end if;
  outcome := case when (objective.direction='AT_LEAST' and target_actual >= objective.target) or (objective.direction='AT_MOST' and target_actual <= objective.target) then 'ACHIEVED'::public.service_objective_status else 'NOT_ACHIEVED'::public.service_objective_status end;
  update public.service_objectives set actual=target_actual,evaluation_evidence=trim(target_evidence),status=outcome,evaluated_at=clock_timestamp(),evaluated_by=auth.uid() where id=objective.id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(objective.organization_id,auth.uid(),'SERVICE_OBJECTIVE_EVALUATED','service_objective',objective.id,jsonb_build_object('actual',target_actual,'status',outcome),'WEB');
end; $$;

create or replace function public.decide_change_approval(target_approval_id uuid,target_decision public.approval_decision,target_comment text default null)
returns void language plpgsql security definer set search_path=public as $$
declare a public.approval_requests%rowtype;
begin
  select * into a from public.approval_requests where id=target_approval_id for update;
  if a.id is null or a.approver_id<>auth.uid() or a.decision<>'PENDING' then raise exception 'APPROVAL_DECISION_NOT_AUTHORIZED'; end if;
  if target_decision not in('APPROVED','REJECTED') then raise exception 'APPROVAL_INVALID_DECISION'; end if;
  if target_decision='REJECTED' and length(trim(target_comment)) not between 10 and 2000 then raise exception 'APPROVAL_REJECTION_COMMENT_REQUIRED'; end if;
  update public.approval_requests set decision=target_decision,comment=nullif(trim(target_comment),''),decided_at=clock_timestamp() where id=a.id;
  update public.changes set status=(case when target_decision='APPROVED' then 'APPROVED' else 'ASSESSMENT' end)::public.change_status where id=a.entity_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(a.organization_id,auth.uid(),'CHANGE_APPROVAL_DECIDED','change',a.entity_id,jsonb_build_object('approval_id',a.id,'decision',target_decision),'WEB');
end; $$;
