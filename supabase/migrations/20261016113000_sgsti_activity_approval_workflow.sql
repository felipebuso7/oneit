create type public.sgsti_approval_status as enum ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED');

alter table public.sgsti_activity_occurrences
  add column approval_status public.sgsti_approval_status not null default 'DRAFT',
  add column submitted_by uuid references public.user_profiles(id) on delete set null,
  add column submitted_at timestamptz,
  add column approved_by uuid references public.user_profiles(id) on delete set null,
  add column approved_at timestamptz,
  add column approval_comment text;

create index sgsti_occurrence_approval_idx on public.sgsti_activity_occurrences(organization_id,approval_status,planned_at);

create or replace function public.prevent_unapproved_sgsti_completion()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED' and new.approval_status <> 'APPROVED' then
    raise exception 'SGSTI_APPROVAL_REQUIRED_BEFORE_COMPLETION';
  end if;
  return new;
end;
$$;

create trigger sgsti_occurrence_requires_approval_before_completion
before update of status on public.sgsti_activity_occurrences
for each row execute function public.prevent_unapproved_sgsti_completion();

create or replace function public.submit_sgsti_activity_for_approval(target_occurrence_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare occurrence public.sgsti_activity_occurrences%rowtype; evidence_count integer; execution public.sgsti_execution_records%rowtype;
begin
  select * into occurrence from public.sgsti_activity_occurrences where id=target_occurrence_id for update;
  if occurrence.id is null then raise exception 'SGSTI_ACTIVITY_NOT_FOUND'; end if;
  if not (public.has_organization_role(occurrence.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]) or public.has_sgsti_role(occurrence.organization_id,array['AUTHOR','REVIEWER']::public.sgsti_role[])) then raise exception 'SGSTI_SUBMISSION_DENIED'; end if;
  select * into execution from public.sgsti_execution_records where occurrence_id=target_occurrence_id;
  select count(*) into evidence_count from public.sgsti_evidences where occurrence_id=target_occurrence_id;
  if coalesce(length(trim(execution.minutes)),0)<10 or coalesce(length(trim(execution.result)),0)<10 or evidence_count=0 then raise exception 'SGSTI_SUBMISSION_RECORD_INCOMPLETE'; end if;
  update public.sgsti_activity_occurrences set approval_status='PENDING_APPROVAL',submitted_by=auth.uid(),submitted_at=clock_timestamp(),approved_by=null,approved_at=null,approval_comment=null,status='UNDER_REVIEW' where id=target_occurrence_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(occurrence.organization_id,auth.uid(),'SGSTI_ACTIVITY_SUBMITTED','sgsti_activity_occurrence',target_occurrence_id,jsonb_build_object('evidence_count',evidence_count),'WEB');
end;
$$;

create or replace function public.decide_sgsti_activity_approval(target_occurrence_id uuid,target_decision text,target_comment text default null)
returns void language plpgsql security definer set search_path=public as $$
declare occurrence public.sgsti_activity_occurrences%rowtype;
begin
  select * into occurrence from public.sgsti_activity_occurrences where id=target_occurrence_id for update;
  if occurrence.id is null then raise exception 'SGSTI_ACTIVITY_NOT_FOUND'; end if;
  if not public.has_sgsti_approval_access(occurrence.organization_id) then raise exception 'SGSTI_APPROVAL_DENIED'; end if;
  if occurrence.approval_status <> 'PENDING_APPROVAL' then raise exception 'SGSTI_ACTIVITY_NOT_PENDING_APPROVAL'; end if;
  if occurrence.submitted_by = auth.uid() then raise exception 'SGSTI_SELF_APPROVAL_DENIED'; end if;
  if target_decision not in ('APPROVE','REJECT') then raise exception 'SGSTI_APPROVAL_INVALID_DECISION'; end if;
  if target_decision='REJECT' and coalesce(length(trim(target_comment)),0)<10 then raise exception 'SGSTI_APPROVAL_COMMENT_REQUIRED'; end if;
  update public.sgsti_activity_occurrences set approval_status=case when target_decision='APPROVE' then 'APPROVED'::public.sgsti_approval_status else 'REJECTED'::public.sgsti_approval_status end,approved_by=auth.uid(),approved_at=clock_timestamp(),approval_comment=nullif(trim(target_comment),''),status=case when target_decision='APPROVE' then 'COMPLETED'::public.sgsti_activity_status else 'AWAITING_EVIDENCE'::public.sgsti_activity_status end,completed_at=case when target_decision='APPROVE' then clock_timestamp() else null end where id=target_occurrence_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(occurrence.organization_id,auth.uid(),case when target_decision='APPROVE' then 'SGSTI_ACTIVITY_APPROVED' else 'SGSTI_ACTIVITY_REJECTED' end,'sgsti_activity_occurrence',target_occurrence_id,jsonb_build_object('decision',target_decision),'WEB');
end;
$$;

revoke all on function public.submit_sgsti_activity_for_approval(uuid),public.decide_sgsti_activity_approval(uuid,text,text) from public;
grant execute on function public.submit_sgsti_activity_for_approval(uuid),public.decide_sgsti_activity_approval(uuid,text,text) to authenticated;
