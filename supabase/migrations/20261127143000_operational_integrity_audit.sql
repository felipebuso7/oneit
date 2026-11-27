create or replace function public.audit_operational_integrity(target_organization_id uuid default null)
returns table(issue_code text, entity_type text, entity_id uuid, detail jsonb)
language sql stable security definer set search_path=public as $$
  select 'ACTIVE_ORDER_CANCELLED_TICKET', 'service_order', so.id,
    jsonb_build_object('ticket_id', so.ticket_id, 'status', so.status)
  from public.service_orders so join public.tickets t on t.id = so.ticket_id
  where (target_organization_id is null or so.organization_id = target_organization_id)
    and (t.operational_status = 'CANCELLED' or t.administrative_status = 'CLOSED')
    and so.status not in ('CANCELLED','COMPLETED','VALIDATED')
  union all
  select 'ORPHAN_ROUTE_STOP', 'route_stop', rs.id,
    jsonb_build_object('route_id', rs.route_id, 'service_order_id', rs.service_order_id)
  from public.field_service_route_stops rs
  left join public.service_orders so on so.id = rs.service_order_id
  where (target_organization_id is null or rs.organization_id = target_organization_id)
    and so.id is null
  union all
  select 'INELIGIBLE_ROUTE_STOP', 'route_stop', rs.id,
    jsonb_build_object('route_id', rs.route_id, 'service_order_id', rs.service_order_id, 'status', so.status)
  from public.field_service_route_stops rs join public.service_orders so on so.id = rs.service_order_id
  join public.tickets t on t.id = so.ticket_id
  where (target_organization_id is null or rs.organization_id = target_organization_id)
    and (so.status not in ('DISPATCHED','TRAVELING','CHECKED_IN','IN_SERVICE') or t.operational_status = 'CANCELLED' or t.administrative_status = 'CLOSED')
  union all
  select 'DUPLICATE_ROUTE_ORDER', 'service_order', rs.service_order_id,
    jsonb_build_object('stop_count', count(*))
  from public.field_service_route_stops rs
  where (target_organization_id is null or rs.organization_id = target_organization_id)
  group by rs.service_order_id having count(*) > 1;
$$;

revoke all on function public.audit_operational_integrity(uuid) from public;
grant execute on function public.audit_operational_integrity(uuid) to authenticated;
