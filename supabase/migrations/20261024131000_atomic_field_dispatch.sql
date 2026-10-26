-- Despacho inicial atômico: OS, atribuição, rota, parada, chamado e auditoria.
-- Reatribuições/reagendamentos terão comando próprio para preservar o histórico da rota original.

create or replace function public.dispatch_ticket_to_field(
  target_ticket_id uuid,
  target_technician_id uuid,
  target_location_id uuid,
  target_planned_start_at timestamptz,
  target_planned_end_at timestamptz,
  target_local_contact_name text default null,
  target_local_contact_phone text default null
)
returns table(service_order_id uuid, order_number text, route_stop_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  ticket_record public.tickets%rowtype;
  existing_order public.service_orders%rowtype;
  created_route_id uuid;
  created_order_id uuid;
  created_stop_id uuid;
  sequence_number smallint;
begin
  if target_planned_end_at <= target_planned_start_at then
    raise exception 'FIELD_DISPATCH_INVALID_WINDOW';
  end if;

  select * into ticket_record from public.tickets where id = target_ticket_id for update;
  if ticket_record.id is null or not public.has_organization_role(ticket_record.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]) then
    raise exception 'FIELD_DISPATCH_NOT_AUTHORIZED';
  end if;
  if ticket_record.operational_status not in ('NEW','TRIAGE','AWAITING_SCHEDULING','SCHEDULED','ASSIGNED') then
    raise exception 'FIELD_DISPATCH_INVALID_TICKET_STATE';
  end if;
  if not exists(select 1 from public.technicians where id = target_technician_id and organization_id = ticket_record.organization_id and active) then
    raise exception 'FIELD_DISPATCH_INVALID_TECHNICIAN';
  end if;
  if not exists(select 1 from public.customer_locations where id = target_location_id and organization_id = ticket_record.organization_id and active) then
    raise exception 'FIELD_DISPATCH_INVALID_LOCATION';
  end if;

  -- Serializa os despachos concorrentes do mesmo técnico e dia.
  perform pg_advisory_xact_lock(hashtextextended(target_technician_id::text || target_planned_start_at::date::text, 0));

  if exists (
    select 1
      from public.field_service_route_stops stop
      join public.field_service_routes route on route.id = stop.route_id
      join public.service_orders so on so.id = stop.service_order_id
     where route.technician_id = target_technician_id
       and route.route_date = target_planned_start_at::date
       and so.status in ('DISPATCHED','TRAVELING','CHECKED_IN','IN_SERVICE')
       and coalesce(stop.planned_start_at, so.scheduled_at) < target_planned_end_at
       and coalesce(stop.planned_end_at, so.scheduled_at + interval '1 hour') > target_planned_start_at
  ) then
    raise exception 'FIELD_DISPATCH_SCHEDULE_CONFLICT';
  end if;

  select * into existing_order from public.service_orders where ticket_id = target_ticket_id for update;
  if existing_order.id is not null then
    raise exception 'FIELD_DISPATCH_ORDER_ALREADY_EXISTS';
  end if;

  insert into public.service_orders(
    organization_id, ticket_id, contract_id, location_id, technician_id, scheduled_at,
    status, dispatched_at, local_contact_name, local_contact_phone, created_by, updated_by
  ) values (
    ticket_record.organization_id, ticket_record.id, ticket_record.contract_id, target_location_id, target_technician_id,
    target_planned_start_at, 'DISPATCHED', clock_timestamp(), nullif(trim(target_local_contact_name), ''), nullif(trim(target_local_contact_phone), ''), auth.uid(), auth.uid()
  ) returning id into created_order_id;

  insert into public.field_service_routes(organization_id, technician_id, route_date, start_location, end_location, created_by, updated_by)
  values(ticket_record.organization_id, target_technician_id, target_planned_start_at::date, '{}'::jsonb, '{}'::jsonb, auth.uid(), auth.uid())
  on conflict(organization_id, technician_id, route_date) do update set updated_by = auth.uid()
  returning id into created_route_id;

  select coalesce(max(sequence_number), 0)::smallint + 1 into sequence_number
    from public.field_service_route_stops stop where stop.route_id = created_route_id;
  insert into public.field_service_route_stops(route_id, organization_id, service_order_id, sequence_number, planned_start_at, planned_end_at)
  values(created_route_id, ticket_record.organization_id, created_order_id, sequence_number, target_planned_start_at, target_planned_end_at)
  returning id into created_stop_id;

  update public.tickets
     set assigned_technician_id = target_technician_id,
         scheduled_at = target_planned_start_at,
         operational_status = 'ASSIGNED',
         version = version + 1
   where id = ticket_record.id;

  insert into public.service_order_events(service_order_id, organization_id, event_type, actor_id, details)
  values
    (created_order_id, ticket_record.organization_id, 'CREATED', auth.uid(), jsonb_build_object('ticket_id', ticket_record.id, 'location_id', target_location_id)),
    (created_order_id, ticket_record.organization_id, 'DISPATCHED', auth.uid(), jsonb_build_object('technician_id', target_technician_id, 'scheduled_at', target_planned_start_at, 'route_id', created_route_id, 'route_stop_id', created_stop_id));
  insert into public.ticket_status_history(ticket_id, organization_id, dimension, previous_status, next_status, actor_id, reason)
  values(ticket_record.id, ticket_record.organization_id, 'OPERATIONAL', ticket_record.operational_status::text, 'ASSIGNED', auth.uid(), 'Despacho pela OS de Field Service');
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values(ticket_record.organization_id, auth.uid(), 'FIELD_DISPATCHED_ATOMIC', 'service_order', created_order_id, jsonb_build_object('ticket_id', ticket_record.id, 'technician_id', target_technician_id, 'location_id', target_location_id, 'route_stop_id', created_stop_id), 'WEB');

  return query select so.id, so.order_number, created_stop_id from public.service_orders so where so.id = created_order_id;
end;
$$;

revoke all on function public.dispatch_ticket_to_field(uuid, uuid, uuid, timestamptz, timestamptz, text, text) from public;
grant execute on function public.dispatch_ticket_to_field(uuid, uuid, uuid, timestamptz, timestamptz, text, text) to authenticated;
