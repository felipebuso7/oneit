-- Shared SGSTI portal workflow.  These functions centralize authorization and
-- preserve a tamper-evident audit event for the two most frequent user actions.
create or replace function public.create_sgsti_activity_template(
  target_organization_id uuid,
  target_title text,
  target_activity_type text,
  target_periodicity public.sgsti_periodicity,
  target_effective_from date,
  target_lead_time_days smallint default 15,
  target_due_after_days smallint default 0,
  target_reminder_days smallint[] default array[15,3,0]::smallint[],
  target_requirement_reference text default null,
  target_policy_reference text default null,
  target_custom_interval_days integer default null,
  target_responsible_id uuid default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare template_id uuid;
begin
  if not public.has_organization_role(target_organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]) then
    raise exception 'SGSTI_MANAGEMENT_DENIED';
  end if;
  if coalesce(length(trim(target_title)),0) not between 3 and 240 or coalesce(length(trim(target_activity_type)),0) not between 2 and 120 then
    raise exception 'SGSTI_ACTIVITY_INVALID_INPUT';
  end if;
  if target_effective_from is null or target_lead_time_days not between 0 and 365 or target_due_after_days not between 0 and 1095 or cardinality(target_reminder_days) not between 1 and 10 then
    raise exception 'SGSTI_ACTIVITY_INVALID_SCHEDULE';
  end if;
  if target_periodicity = 'CUSTOM' and target_custom_interval_days is null then
    raise exception 'SGSTI_CUSTOM_INTERVAL_REQUIRED';
  end if;
  insert into public.sgsti_activity_templates(
    organization_id,title,activity_type,requirement_reference,policy_reference,periodicity,
    custom_interval_days,effective_from,lead_time_days,reminder_days,due_after_days,responsible_id
  ) values (
    target_organization_id,trim(target_title),trim(target_activity_type),nullif(trim(target_requirement_reference),''),
    nullif(trim(target_policy_reference),''),target_periodicity,target_custom_interval_days,target_effective_from,
    target_lead_time_days,target_reminder_days,target_due_after_days,target_responsible_id
  ) returning id into template_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
    values(target_organization_id,auth.uid(),'SGSTI_ACTIVITY_TEMPLATE_CREATED','sgsti_activity_template',template_id,
      jsonb_build_object('title',trim(target_title),'periodicity',target_periodicity,'effective_from',target_effective_from),'WEB');
  return template_id;
end;
$$;

create or replace function public.create_sgsti_activity_evidence(
  target_occurrence_id uuid,
  target_title text,
  target_kind text,
  target_external_url text default null,
  target_storage_key text default null,
  target_note text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare occurrence public.sgsti_activity_occurrences%rowtype; evidence_id uuid;
begin
  select * into occurrence from public.sgsti_activity_occurrences where id=target_occurrence_id for update;
  if occurrence.id is null then raise exception 'SGSTI_ACTIVITY_NOT_FOUND'; end if;
  if not public.has_organization_role(occurrence.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]) then raise exception 'SGSTI_MANAGEMENT_DENIED'; end if;
  if coalesce(length(trim(target_title)),0) not between 3 and 240 or target_kind not in ('FILE','EXTERNAL_LINK','TICKET','CHANGE','PROBLEM','REPORT','DASHBOARD','DOCUMENT','METRIC','OTHER') then
    raise exception 'SGSTI_EVIDENCE_INVALID_INPUT';
  end if;
  if target_kind in ('FILE','EXTERNAL_LINK') and nullif(trim(coalesce(target_external_url,'')),'') is null and nullif(trim(coalesce(target_storage_key,'')),'') is null then
    raise exception 'SGSTI_EVIDENCE_REFERENCE_REQUIRED';
  end if;
  insert into public.sgsti_evidences(organization_id,occurrence_id,title,description,evidence_kind,external_url,storage_key,note,captured_by)
    values(occurrence.organization_id,target_occurrence_id,trim(target_title),trim(target_title),target_kind,nullif(trim(target_external_url),''),nullif(trim(target_storage_key),''),nullif(trim(target_note),''),auth.uid()) returning id into evidence_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
    values(occurrence.organization_id,auth.uid(),'SGSTI_EVIDENCE_LINKED','sgsti_evidence',evidence_id,jsonb_build_object('occurrence_id',target_occurrence_id,'kind',target_kind),'WEB');
  return evidence_id;
end;
$$;

create or replace function public.record_sgsti_activity_execution(
  target_occurrence_id uuid,
  target_status public.sgsti_activity_status,
  target_attendees text default null,
  target_minutes text default null,
  target_decisions text default null,
  target_action_plan text default null,
  target_result_summary text default null,
  target_justification text default null
) returns void language plpgsql security definer set search_path=public as $$
declare occurrence public.sgsti_activity_occurrences%rowtype; evidence_count integer;
begin
  select * into occurrence from public.sgsti_activity_occurrences where id=target_occurrence_id for update;
  if occurrence.id is null then raise exception 'SGSTI_ACTIVITY_NOT_FOUND'; end if;
  if not public.has_organization_role(occurrence.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]) then
    raise exception 'SGSTI_MANAGEMENT_DENIED';
  end if;
  if occurrence.status in ('COMPLETED','CANCELLED') then raise exception 'SGSTI_ACTIVITY_LOCKED'; end if;
  if target_status = 'COMPLETED' and (coalesce(length(trim(target_minutes)),0) < 10 or coalesce(length(trim(target_result_summary)),0) < 10) then
    raise exception 'SGSTI_COMPLETION_RECORD_REQUIRED';
  end if;
  select count(*) into evidence_count from public.sgsti_evidences where occurrence_id = target_occurrence_id;
  if target_status = 'COMPLETED' and evidence_count = 0 then
    raise exception 'SGSTI_COMPLETION_EVIDENCE_REQUIRED';
  end if;
  insert into public.sgsti_execution_records(occurrence_id,attendees,minutes,decisions,result,action_summary,recorded_by,recorded_at)
    values(target_occurrence_id,nullif(trim(target_attendees),''),nullif(trim(target_minutes),''),nullif(trim(target_decisions),''),nullif(trim(target_result_summary),''),nullif(trim(target_action_plan),''),auth.uid(),clock_timestamp())
  on conflict (occurrence_id) do update set attendees=excluded.attendees,minutes=excluded.minutes,decisions=excluded.decisions,result=excluded.result,action_summary=excluded.action_summary,recorded_by=auth.uid(),recorded_at=clock_timestamp();
  update public.sgsti_activity_occurrences set
    status=target_status,result_summary=coalesce(nullif(trim(target_result_summary),''),result_summary),
    justification=coalesce(nullif(trim(target_justification),''),justification),
    completed_at=case when target_status='COMPLETED' then clock_timestamp() else completed_at end
  where id=target_occurrence_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
    values(occurrence.organization_id,auth.uid(),'SGSTI_EXECUTION_RECORDED','sgsti_activity_occurrence',target_occurrence_id,
      jsonb_build_object('status',target_status),'WEB');
end;
$$;

revoke all on function public.create_sgsti_activity_template(uuid,text,text,public.sgsti_periodicity,date,smallint,smallint,smallint[],text,text,integer,uuid) from public;
revoke all on function public.record_sgsti_activity_execution(uuid,public.sgsti_activity_status,text,text,text,text,text,text) from public;
revoke all on function public.create_sgsti_activity_evidence(uuid,text,text,text,text,text) from public;
grant execute on function public.create_sgsti_activity_template(uuid,text,text,public.sgsti_periodicity,date,smallint,smallint,smallint[],text,text,integer,uuid) to authenticated;
grant execute on function public.record_sgsti_activity_execution(uuid,public.sgsti_activity_status,text,text,text,text,text,text) to authenticated;
grant execute on function public.create_sgsti_activity_evidence(uuid,text,text,text,text,text) to authenticated;
