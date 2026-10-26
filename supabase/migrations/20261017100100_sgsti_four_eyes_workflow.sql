alter table public.sgsti_activity_occurrences add column if not exists reviewed_by uuid references public.user_profiles(id) on delete set null, add column if not exists reviewed_at timestamptz, add column if not exists reviewer_comment text;

create or replace function public.submit_sgsti_activity_for_approval(target_occurrence_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare occurrence public.sgsti_activity_occurrences%rowtype; evidence_count integer; execution public.sgsti_execution_records%rowtype;
begin
 select * into occurrence from public.sgsti_activity_occurrences where id=target_occurrence_id for update;
 if occurrence.id is null or not public.has_sgsti_management_access(occurrence.organization_id) then raise exception 'SGSTI_SUBMISSION_NOT_AUTHORIZED'; end if;
 if occurrence.status in ('COMPLETED','CANCELLED') then raise exception 'SGSTI_SUBMISSION_INVALID_STATE'; end if;
 select * into execution from public.sgsti_execution_records where occurrence_id=target_occurrence_id; select count(*) into evidence_count from public.sgsti_evidences where occurrence_id=target_occurrence_id;
 if coalesce(length(trim(execution.minutes)),0)<10 or coalesce(length(trim(execution.result)),0)<10 or evidence_count=0 then raise exception 'SGSTI_SUBMISSION_EVIDENCE_REQUIRED'; end if;
 update public.sgsti_activity_occurrences set approval_status='PENDING_REVIEW',submitted_by=auth.uid(),submitted_at=clock_timestamp(),reviewed_by=null,reviewed_at=null,reviewer_comment=null,approved_by=null,approved_at=null,approval_comment=null,status='UNDER_REVIEW' where id=target_occurrence_id;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(occurrence.organization_id,auth.uid(),'SGSTI_ACTIVITY_SUBMITTED_FOR_REVIEW','sgsti_activity_occurrence',occurrence.id,jsonb_build_object('status','PENDING_REVIEW'),'WEB');
end; $$;

create or replace function public.review_sgsti_activity(target_occurrence_id uuid,target_comment text) returns void language plpgsql security definer set search_path=public as $$
declare occurrence public.sgsti_activity_occurrences%rowtype;
begin
 select * into occurrence from public.sgsti_activity_occurrences where id=target_occurrence_id for update;
 if occurrence.id is null or not (public.has_sgsti_role(occurrence.organization_id,'REVIEWER') or public.has_organization_role(occurrence.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[])) then raise exception 'SGSTI_REVIEW_NOT_AUTHORIZED'; end if;
 if occurrence.approval_status<>'PENDING_REVIEW' then raise exception 'SGSTI_REVIEW_INVALID_STATE'; end if;
 if occurrence.submitted_by=auth.uid() then raise exception 'SGSTI_SELF_REVIEW_FORBIDDEN'; end if;
 if coalesce(length(trim(target_comment)),0)<10 then raise exception 'SGSTI_REVIEW_COMMENT_REQUIRED'; end if;
 update public.sgsti_activity_occurrences set approval_status='PENDING_APPROVAL',reviewed_by=auth.uid(),reviewed_at=clock_timestamp(),reviewer_comment=trim(target_comment),approval_comment=null where id=occurrence.id;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(occurrence.organization_id,auth.uid(),'SGSTI_ACTIVITY_REVIEWED','sgsti_activity_occurrence',occurrence.id,jsonb_build_object('status','PENDING_APPROVAL'),'WEB');
end; $$;

create or replace function public.decide_sgsti_activity_approval(target_occurrence_id uuid,target_decision text,target_comment text default null) returns void language plpgsql security definer set search_path=public as $$
declare occurrence public.sgsti_activity_occurrences%rowtype;
begin
 select * into occurrence from public.sgsti_activity_occurrences where id=target_occurrence_id for update;
 if occurrence.id is null or not public.has_sgsti_approval_access(occurrence.organization_id) then raise exception 'SGSTI_APPROVAL_NOT_AUTHORIZED'; end if;
 if occurrence.approval_status<>'PENDING_APPROVAL' then raise exception 'SGSTI_APPROVAL_INVALID_STATE'; end if;
 if occurrence.submitted_by=auth.uid() or occurrence.reviewed_by=auth.uid() then raise exception 'SGSTI_APPROVAL_SEGREGATION_REQUIRED'; end if;
 if target_decision not in ('APPROVE','REJECT') then raise exception 'SGSTI_APPROVAL_INVALID_DECISION'; end if;
 if target_decision='REJECT' and coalesce(length(trim(target_comment)),0)<10 then raise exception 'SGSTI_REJECTION_COMMENT_REQUIRED'; end if;
 update public.sgsti_activity_occurrences set approval_status=case when target_decision='APPROVE' then 'APPROVED'::public.sgsti_approval_status else 'REJECTED'::public.sgsti_approval_status end,approved_by=auth.uid(),approved_at=clock_timestamp(),approval_comment=nullif(trim(target_comment),''),status=case when target_decision='APPROVE' then 'COMPLETED'::public.sgsti_activity_status else 'AWAITING_EVIDENCE'::public.sgsti_activity_status end,completed_at=case when target_decision='APPROVE' then clock_timestamp() else null end where id=target_occurrence_id;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(occurrence.organization_id,auth.uid(),case when target_decision='APPROVE' then 'SGSTI_ACTIVITY_APPROVED' else 'SGSTI_ACTIVITY_REJECTED' end,'sgsti_activity_occurrence',occurrence.id,jsonb_build_object('decision',target_decision),'WEB');
end; $$;

revoke all on function public.submit_sgsti_activity_for_approval(uuid),public.review_sgsti_activity(uuid,text),public.decide_sgsti_activity_approval(uuid,text,text) from public;
grant execute on function public.submit_sgsti_activity_for_approval(uuid),public.review_sgsti_activity(uuid,text),public.decide_sgsti_activity_approval(uuid,text,text) to authenticated;
