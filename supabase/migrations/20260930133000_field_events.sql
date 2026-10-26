create type public.field_event_type as enum ('TRAVEL_STARTED', 'ARRIVAL', 'WORK_STARTED');
create table public.ticket_field_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  technician_id uuid not null references public.technicians(id) on delete restrict,
  event_type public.field_event_type not null,
  occurred_at timestamptz not null default now(),
  latitude numeric(9,6), longitude numeric(9,6), accuracy_meters numeric(10,2),
  location_justification text, offline_created_at timestamptz,
  server_received_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index ticket_field_events_ticket_idx on public.ticket_field_events(ticket_id, occurred_at);

create or replace function public.record_ticket_field_event(
  target_ticket_id uuid, target_event public.field_event_type, target_latitude numeric default null,
  target_longitude numeric default null, target_accuracy numeric default null, target_justification text default null,
  target_offline_created_at timestamptz default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare target_technician_id uuid; current_status public.ticket_operational_status; next_status public.ticket_operational_status; created_event_id uuid;
begin
  select assigned_technician_id, operational_status into target_technician_id, current_status from public.tickets where id = target_ticket_id for update;
  if target_technician_id is null or not public.is_ticket_assigned_to_current_user(target_technician_id) then raise exception 'Only the assigned technician can record this event.'; end if;
  next_status := case target_event when 'TRAVEL_STARTED' then 'TRAVEL_STARTED'::public.ticket_operational_status when 'ARRIVAL' then 'ON_SITE'::public.ticket_operational_status when 'WORK_STARTED' then 'WORK_STARTED'::public.ticket_operational_status end;
  if (target_event = 'TRAVEL_STARTED' and current_status <> 'ASSIGNED') or (target_event = 'ARRIVAL' and current_status <> 'TRAVEL_STARTED') or (target_event = 'WORK_STARTED' and current_status <> 'ON_SITE') then raise exception 'Invalid field-event transition.'; end if;
  insert into public.ticket_field_events (ticket_id, technician_id, event_type, latitude, longitude, accuracy_meters, location_justification, offline_created_at)
  values (target_ticket_id, target_technician_id, target_event, target_latitude, target_longitude, target_accuracy, target_justification, target_offline_created_at) returning id into created_event_id;
  update public.tickets set operational_status = next_status where id = target_ticket_id;
  return created_event_id;
end;
$$;
revoke all on function public.record_ticket_field_event(uuid, public.field_event_type, numeric, numeric, numeric, text, timestamptz) from public;
grant execute on function public.record_ticket_field_event(uuid, public.field_event_type, numeric, numeric, numeric, text, timestamptz) to authenticated;
alter table public.ticket_field_events enable row level security;
create policy "management reads field events" on public.ticket_field_events for select to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_id and public.has_ticket_management_role(t.organization_id)));
create policy "technicians read own field events" on public.ticket_field_events for select to authenticated using (public.is_ticket_assigned_to_current_user(technician_id));
