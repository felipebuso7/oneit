create table public.ticket_pending_periods (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  previous_status public.ticket_operational_status not null,
  pending_status public.ticket_operational_status not null,
  reason text not null check (length(trim(reason)) between 10 and 2000),
  started_by uuid not null references public.user_profiles(id) on delete restrict,
  started_at timestamptz not null default clock_timestamp(),
  resolved_by uuid references public.user_profiles(id) on delete restrict,
  resolved_at timestamptz,
  resolution_reason text,
  check ((resolved_at is null and resolved_by is null and resolution_reason is null)
    or (resolved_at is not null and resolved_by is not null and resolution_reason is not null and length(trim(resolution_reason)) between 10 and 2000))
);
create unique index ticket_one_open_pending on public.ticket_pending_periods(ticket_id) where resolved_at is null;
create index ticket_pending_date on public.ticket_pending_periods(ticket_id, started_at desc);
create table public.ticket_schedule_changes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  old_schedule_id uuid not null references public.ticket_schedules(id) on delete restrict,
  new_schedule_id uuid not null unique references public.ticket_schedules(id) on delete restrict,
  reason text not null check (length(trim(reason)) between 10 and 2000),
  changed_by uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp()
);
alter table public.ticket_pending_periods enable row level security;
alter table public.ticket_schedule_changes enable row level security;
create policy "read visible pending periods" on public.ticket_pending_periods for select to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_id));
create policy "read visible schedule changes" on public.ticket_schedule_changes for select to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_id));

create or replace function public.mark_ticket_pending(target_ticket_id uuid, expected_version integer, target_status public.ticket_operational_status, target_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare ticket public.tickets%rowtype; pending_id uuid;
begin
  select * into ticket from public.tickets where id = target_ticket_id for update;
  if ticket.id is null or not (public.has_ticket_management_role(ticket.organization_id) or public.is_ticket_assigned_to_current_user(ticket.assigned_technician_id))
    or not exists (select 1 from public.user_profiles where id = auth.uid() and active) then raise exception 'PENDING_NOT_AUTHORIZED'; end if;
  if expected_version is null or ticket.version <> expected_version then raise exception 'PENDING_VERSION_CONFLICT'; end if;
  if not coalesce((target_status = 'PENDING_CUSTOMER' and ticket.operational_status in ('TRIAGE','IN_PROGRESS'))
    or (target_status = 'PENDING_ACCESS' and ticket.operational_status in ('TRAVEL_STARTED','ON_SITE'))
    or (target_status = 'PENDING_MATERIAL' and ticket.operational_status in ('AWAITING_SCHEDULING','WORK_STARTED','IN_PROGRESS'))
    or (target_status = 'PENDING_THIRD_PARTY' and ticket.operational_status = 'IN_PROGRESS')
    or (target_status = 'PENDING_CLIENT_IT' and ticket.operational_status in ('ON_SITE','WORK_STARTED','IN_PROGRESS'))
    or (target_status = 'WAITING_AUTHORIZATION' and ticket.operational_status = 'AWAITING_SCHEDULING'), false) then raise exception 'PENDING_INVALID_STATE'; end if;
  insert into public.ticket_pending_periods(ticket_id, previous_status, pending_status, reason, started_by)
  values (ticket.id, ticket.operational_status, target_status, target_reason, auth.uid()) returning id into pending_id;
  update public.tickets set operational_status = target_status where id = ticket.id;
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values (ticket.organization_id, auth.uid(), 'PENDING_STARTED', 'ticket', ticket.id, jsonb_build_object('pending_id', pending_id, 'status', target_status, 'reason', target_reason), 'WEB');
  return pending_id;
end;
$$;
create or replace function public.resume_ticket(target_ticket_id uuid, expected_version integer, target_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare ticket public.tickets%rowtype; pending public.ticket_pending_periods%rowtype;
begin
  select * into ticket from public.tickets where id = target_ticket_id for update;
  if ticket.id is null or not public.has_ticket_management_role(ticket.organization_id)
    or not exists (select 1 from public.user_profiles where id = auth.uid() and active) then raise exception 'PENDING_NOT_AUTHORIZED'; end if;
  if expected_version is null or ticket.version <> expected_version then raise exception 'PENDING_VERSION_CONFLICT'; end if;
  select * into pending from public.ticket_pending_periods where ticket_id = ticket.id and resolved_at is null;
  if pending.id is null or ticket.operational_status <> pending.pending_status then raise exception 'PENDING_INVALID_STATE'; end if;
  if target_reason is null or length(trim(target_reason)) not between 10 and 2000 then raise exception 'PENDING_REASON_REQUIRED'; end if;
  update public.ticket_pending_periods set resolved_at = clock_timestamp(), resolved_by = auth.uid(), resolution_reason = target_reason where id = pending.id;
  update public.tickets set operational_status = pending.previous_status where id = ticket.id;
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values (ticket.organization_id, auth.uid(), 'PENDING_RESOLVED', 'ticket', ticket.id, jsonb_build_object('pending_id', pending.id, 'resumed_status', pending.previous_status, 'reason', target_reason), 'WEB');
end;
$$;

create or replace function public.reschedule_ticket(target_ticket_id uuid, expected_version integer, target_technician_id uuid, target_start timestamptz, target_end timestamptz, target_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare ticket public.tickets%rowtype; old_schedule public.ticket_schedules%rowtype; new_schedule_id uuid;
begin
  select * into ticket from public.tickets where id = target_ticket_id for update;
  if ticket.id is null or not public.has_ticket_management_role(ticket.organization_id)
    or not exists (select 1 from public.user_profiles where id = auth.uid() and active) then raise exception 'RESCHEDULE_NOT_AUTHORIZED'; end if;
  if expected_version is null or ticket.version <> expected_version then raise exception 'RESCHEDULE_VERSION_CONFLICT'; end if;
  if ticket.operational_status not in ('SCHEDULED','ASSIGNED','TRAVEL_STARTED','ON_SITE') then raise exception 'RESCHEDULE_INVALID_STATE'; end if;
  if target_start is null or target_end is null or target_end <= target_start then raise exception 'RESCHEDULE_INVALID_TIME'; end if;
  if target_reason is null or length(trim(target_reason)) not between 10 and 2000 then raise exception 'RESCHEDULE_REASON_REQUIRED'; end if;
  if not exists (select 1 from public.technicians where id = target_technician_id and organization_id = ticket.organization_id and active) then raise exception 'RESCHEDULE_INVALID_TECHNICIAN'; end if;
  select * into old_schedule from public.ticket_schedules where ticket_id = ticket.id and status = 'SCHEDULED';
  if old_schedule.id is null then raise exception 'RESCHEDULE_MISSING_SCHEDULE'; end if;
  update public.ticket_schedules set status = 'RESCHEDULED' where id = old_schedule.id;
  insert into public.ticket_schedules(ticket_id, technician_id, planned_start, planned_end, dispatcher_id)
  values (ticket.id, target_technician_id, target_start, target_end, auth.uid()) returning id into new_schedule_id;
  insert into public.ticket_schedule_changes(ticket_id, old_schedule_id, new_schedule_id, reason, changed_by)
  values (ticket.id, old_schedule.id, new_schedule_id, target_reason, auth.uid());
  update public.tickets set operational_status = 'SCHEDULED', scheduled_at = target_start, assigned_technician_id = null where id = ticket.id;
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values (ticket.organization_id, auth.uid(), 'TICKET_RESCHEDULED', 'ticket', ticket.id, jsonb_build_object('old_schedule_id', old_schedule.id, 'new_schedule_id', new_schedule_id, 'reason', target_reason), 'WEB');
  return new_schedule_id;
end;
$$;
revoke all on function public.mark_ticket_pending(uuid, integer, public.ticket_operational_status, text), public.resume_ticket(uuid, integer, text), public.reschedule_ticket(uuid, integer, uuid, timestamptz, timestamptz, text) from public;
grant execute on function public.mark_ticket_pending(uuid, integer, public.ticket_operational_status, text), public.resume_ticket(uuid, integer, text), public.reschedule_ticket(uuid, integer, uuid, timestamptz, timestamptz, text) to authenticated;
