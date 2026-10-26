-- Reatribui uma OS em triagem sem criar outra OS. A parada atual é movida;
-- seus dados anteriores ficam no evento e na auditoria da transação.
create or replace function public.redispatch_service_order(
  target_order_id uuid,
  target_technician_id uuid,
  target_planned_start_at timestamptz,
  target_planned_end_at timestamptz
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  order_record public.service_orders%rowtype;
  ticket_record public.tickets%rowtype;
  previous_stop public.field_service_route_stops%rowtype;
  new_route public.field_service_routes%rowtype;
  new_stop_id uuid;
  next_sequence smallint;
begin
  if target_planned_start_at is null or target_planned_end_at is null
    or target_planned_end_at <= target_planned_start_at
    or target_planned_end_at - target_planned_start_at > interval '12 hours'
    or target_planned_start_at::date <> target_planned_end_at::date then
    raise exception 'FIELD_REDISPATCH_INVALID_WINDOW';
  end if;

  select * into order_record from public.service_orders where id = target_order_id for update;
  if order_record.id is null or not public.has_organization_role(order_record.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]) then
    raise exception 'FIELD_REDISPATCH_NOT_AUTHORIZED';
  end if;
  if order_record.status <> 'TRIAGE' then raise exception 'FIELD_REDISPATCH_INVALID_STATE'; end if;
  if not exists(select 1 from public.technicians where id = target_technician_id and organization_id = order_record.organization_id and active) then
    raise exception 'FIELD_REDISPATCH_INVALID_TECHNICIAN';
  end if;
  select * into ticket_record from public.tickets where id = order_record.ticket_id for update;
  if ticket_record.id is null or ticket_record.operational_status not in ('NEW','TRIAGE','AWAITING_SCHEDULING','SCHEDULED','ASSIGNED') then
    raise exception 'FIELD_REDISPATCH_INVALID_TICKET_STATE';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_technician_id::text || target_planned_start_at::date::text, 0));
  if exists (
    select 1 from public.field_service_route_stops stop
    join public.field_service_routes route on route.id = stop.route_id
    join public.service_orders other_order on other_order.id = stop.service_order_id
    where route.technician_id = target_technician_id and route.route_date = target_planned_start_at::date
      and other_order.id <> order_record.id and other_order.status in ('DISPATCHED','TRAVELING','CHECKED_IN','IN_SERVICE')
      and coalesce(stop.planned_start_at, other_order.scheduled_at) < target_planned_end_at
      and coalesce(stop.planned_end_at, other_order.scheduled_at + interval '1 hour') > target_planned_start_at
  ) then raise exception 'FIELD_REDISPATCH_SCHEDULE_CONFLICT'; end if;

  select * into previous_stop from public.field_service_route_stops where service_order_id = order_record.id for update;
  if previous_stop.travel_started_at is not null or previous_stop.checked_in_at is not null or previous_stop.checked_out_at is not null then
    raise exception 'FIELD_REDISPATCH_ROUTE_ALREADY_STARTED';
  end if;
  insert into public.field_service_routes(organization_id, technician_id, route_date, start_location, end_location, created_by, updated_by)
  values(order_record.organization_id, target_technician_id, target_planned_start_at::date, '{}'::jsonb, '{}'::jsonb, auth.uid(), auth.uid())
  on conflict(organization_id, technician_id, route_date) do update set updated_by = auth.uid()
  returning * into new_route;
  if new_route.status not in ('PLANNED','IN_PROGRESS') then raise exception 'FIELD_REDISPATCH_ROUTE_CLOSED'; end if;

  select (coalesce(max(stop.sequence_number), 0) + 1)::smallint into next_sequence
    from public.field_service_route_stops stop where stop.route_id = new_route.id and stop.service_order_id <> order_record.id;
  if next_sequence > 999 then raise exception 'FIELD_REDISPATCH_ROUTE_FULL'; end if;
  if previous_stop.id is null then
    insert into public.field_service_route_stops(route_id, organization_id, service_order_id, sequence_number, planned_start_at, planned_end_at)
    values(new_route.id, order_record.organization_id, order_record.id, next_sequence, target_planned_start_at, target_planned_end_at)
    returning id into new_stop_id;
  else
    update public.field_service_route_stops set route_id = new_route.id, sequence_number = next_sequence,
      planned_start_at = target_planned_start_at, planned_end_at = target_planned_end_at
    where id = previous_stop.id returning id into new_stop_id;
  end if;

  update public.service_order_partner_accesses set revoked_at = clock_timestamp()
    where service_order_id = order_record.id and revoked_at is null;
  update public.service_orders set technician_id = target_technician_id, scheduled_at = target_planned_start_at,
    status = 'DISPATCHED', dispatched_at = clock_timestamp(), updated_by = auth.uid() where id = order_record.id;
  update public.tickets set assigned_technician_id = target_technician_id, scheduled_at = target_planned_start_at,
    operational_status = 'ASSIGNED', version = version + 1 where id = ticket_record.id;
  insert into public.service_order_events(service_order_id, organization_id, event_type, actor_id, details)
  values(order_record.id, order_record.organization_id, 'DISPATCHED', auth.uid(), jsonb_build_object(
    'action','REDISPATCH', 'previous_technician_id',order_record.technician_id,
    'previous_route_id',previous_stop.route_id, 'previous_start_at',previous_stop.planned_start_at,
    'previous_end_at',previous_stop.planned_end_at, 'technician_id',target_technician_id,
    'route_id',new_route.id, 'route_stop_id',new_stop_id, 'planned_start_at',target_planned_start_at, 'planned_end_at',target_planned_end_at));
  insert into public.ticket_status_history(ticket_id, organization_id, dimension, previous_status, next_status, actor_id, reason)
  values(ticket_record.id, order_record.organization_id, 'OPERATIONAL', ticket_record.operational_status::text, 'ASSIGNED', auth.uid(), 'Redistribuição da OS ' || order_record.order_number);
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values(order_record.organization_id, auth.uid(), 'FIELD_REDISPATCHED', 'service_order', order_record.id,
    jsonb_build_object('previous_technician_id',order_record.technician_id, 'previous_route_id',previous_stop.route_id,
      'technician_id',target_technician_id, 'route_id',new_route.id, 'route_stop_id',new_stop_id), 'WEB');
  return new_stop_id;
end;
$$;

revoke all on function public.redispatch_service_order(uuid,uuid,timestamptz,timestamptz) from public;
grant execute on function public.redispatch_service_order(uuid,uuid,timestamptz,timestamptz) to authenticated;
