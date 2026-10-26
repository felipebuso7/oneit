create type public.schedule_status as enum ('SCHEDULED', 'RESCHEDULED', 'CANCELLED');
create table public.ticket_schedules (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  technician_id uuid not null references public.technicians(id) on delete restrict,
  planned_start timestamptz not null,
  planned_end timestamptz not null,
  status public.schedule_status not null default 'SCHEDULED',
  dispatcher_id uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (planned_end > planned_start)
);
create index ticket_schedules_ticket_idx on public.ticket_schedules(ticket_id, created_at desc);
create index ticket_schedules_technician_idx on public.ticket_schedules(technician_id, planned_start);

create or replace function public.schedule_ticket(
  target_ticket_id uuid, target_technician_id uuid, target_start timestamptz, target_end timestamptz
)
returns uuid language plpgsql security invoker set search_path = public as $$
declare target_organization_id uuid; created_schedule_id uuid;
begin
  select organization_id into target_organization_id from public.tickets where id = target_ticket_id for update;
  if target_organization_id is null or not public.has_ticket_management_role(target_organization_id) then raise exception 'Not authorized to schedule this ticket.'; end if;
  if not exists (select 1 from public.technicians where id = target_technician_id and organization_id = target_organization_id and active) then raise exception 'Technician must belong to the ticket organization.'; end if;
  if (select operational_status from public.tickets where id = target_ticket_id) <> 'AWAITING_SCHEDULING' then raise exception 'Ticket is not awaiting scheduling.'; end if;
  if target_end <= target_start then raise exception 'Schedule end must be after start.'; end if;
  if exists (select 1 from public.ticket_schedules where technician_id = target_technician_id and status = 'SCHEDULED' and planned_start < target_end and planned_end > target_start) then raise exception 'Technician has a conflicting schedule.'; end if;
  insert into public.ticket_schedules (ticket_id, technician_id, planned_start, planned_end, dispatcher_id) values (target_ticket_id, target_technician_id, target_start, target_end, auth.uid()) returning id into created_schedule_id;
  update public.tickets set scheduled_at = target_start, operational_status = 'SCHEDULED' where id = target_ticket_id;
  return created_schedule_id;
end;
$$;

create or replace function public.assign_ticket(target_ticket_id uuid, target_technician_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare target_organization_id uuid;
begin
  select organization_id into target_organization_id from public.tickets where id = target_ticket_id for update;
  if target_organization_id is null or not public.has_ticket_management_role(target_organization_id) then raise exception 'Not authorized to assign this ticket.'; end if;
  if (select operational_status from public.tickets where id = target_ticket_id) <> 'SCHEDULED' then raise exception 'Ticket must be scheduled before assignment.'; end if;
  if not exists (select 1 from public.ticket_schedules where ticket_id = target_ticket_id and technician_id = target_technician_id and status = 'SCHEDULED') then raise exception 'Assigned technician must own the active schedule.'; end if;
  update public.tickets set assigned_technician_id = target_technician_id, operational_status = 'ASSIGNED' where id = target_ticket_id;
end;
$$;
revoke all on function public.schedule_ticket(uuid, uuid, timestamptz, timestamptz), public.assign_ticket(uuid, uuid) from public;
grant execute on function public.schedule_ticket(uuid, uuid, timestamptz, timestamptz), public.assign_ticket(uuid, uuid) to authenticated;

alter table public.ticket_schedules enable row level security;
create policy "management reads schedules" on public.ticket_schedules for select to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_id and public.has_ticket_management_role(t.organization_id)));
create policy "technicians read own schedules" on public.ticket_schedules for select to authenticated using (public.is_ticket_assigned_to_current_user(technician_id));
