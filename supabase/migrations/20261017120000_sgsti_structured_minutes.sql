alter table public.sgsti_execution_records
  add column if not exists meeting_started_at timestamptz,
  add column if not exists meeting_ended_at timestamptz,
  add column if not exists meeting_location text,
  add column if not exists meeting_facilitator text,
  add column if not exists attendee_roles text,
  add constraint sgsti_execution_meeting_time_check check(meeting_ended_at is null or meeting_started_at is null or meeting_ended_at >= meeting_started_at);

create or replace function public.record_sgsti_meeting_metadata(target_occurrence_id uuid,target_started_at timestamptz default null,target_ended_at timestamptz default null,target_location text default null,target_facilitator text default null,target_attendee_roles text default null)
returns void language plpgsql security definer set search_path=public as $$
declare occurrence public.sgsti_activity_occurrences%rowtype;
begin
 select * into occurrence from public.sgsti_activity_occurrences where id=target_occurrence_id for update;
 if occurrence.id is null or not public.has_sgsti_management_access(occurrence.organization_id) then raise exception 'SGSTI_MEETING_NOT_AUTHORIZED'; end if;
 if target_ended_at is not null and target_started_at is not null and target_ended_at<target_started_at then raise exception 'SGSTI_MEETING_TIME_INVALID'; end if;
 insert into public.sgsti_execution_records(occurrence_id,meeting_started_at,meeting_ended_at,meeting_location,meeting_facilitator,attendee_roles,recorded_by)
 values(occurrence.id,target_started_at,target_ended_at,nullif(trim(target_location),''),nullif(trim(target_facilitator),''),nullif(trim(target_attendee_roles),''),auth.uid())
 on conflict(occurrence_id) do update set meeting_started_at=excluded.meeting_started_at,meeting_ended_at=excluded.meeting_ended_at,meeting_location=excluded.meeting_location,meeting_facilitator=excluded.meeting_facilitator,attendee_roles=excluded.attendee_roles;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(occurrence.organization_id,auth.uid(),'SGSTI_MEETING_METADATA_RECORDED','sgsti_activity_occurrence',occurrence.id,jsonb_build_object('started_at',target_started_at,'location',nullif(trim(target_location),'')),'WEB');
end; $$;
revoke all on function public.record_sgsti_meeting_metadata(uuid,timestamptz,timestamptz,text,text,text) from public;
grant execute on function public.record_sgsti_meeting_metadata(uuid,timestamptz,timestamptz,text,text,text) to authenticated;
