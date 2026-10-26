create or replace function public.record_ticket_field_event(
  target_ticket_id uuid, target_event public.field_event_type, target_latitude numeric default null,
  target_longitude numeric default null, target_accuracy numeric default null, target_justification text default null,
  target_offline_created_at timestamptz default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare target_technician_id uuid; current_status public.ticket_operational_status; next_status public.ticket_operational_status; created_event_id uuid; ticket_organization_id uuid; order_record public.service_orders%rowtype; order_status text; order_event text;
begin
  select assigned_technician_id, operational_status, organization_id into target_technician_id, current_status, ticket_organization_id from public.tickets where id = target_ticket_id for update;
  if target_technician_id is null or not public.is_ticket_assigned_to_current_user(target_technician_id) then raise exception 'Only the assigned technician can record this event.'; end if;
  next_status := case target_event when 'TRAVEL_STARTED' then 'TRAVEL_STARTED'::public.ticket_operational_status when 'ARRIVAL' then 'ON_SITE'::public.ticket_operational_status when 'WORK_STARTED' then 'WORK_STARTED'::public.ticket_operational_status end;
  if (target_event = 'TRAVEL_STARTED' and current_status <> 'ASSIGNED') or (target_event = 'ARRIVAL' and current_status <> 'TRAVEL_STARTED') or (target_event = 'WORK_STARTED' and current_status <> 'ON_SITE') then raise exception 'Invalid field-event transition.'; end if;
  select * into order_record from public.service_orders where ticket_id=target_ticket_id for update;
  if order_record.id is not null and (order_record.technician_id is distinct from target_technician_id or order_record.status in('COMPLETED','VALIDATED','CANCELLED')) then raise exception 'Service order state does not permit this field event.'; end if;
  insert into public.ticket_field_events (ticket_id, technician_id, event_type, latitude, longitude, accuracy_meters, location_justification, offline_created_at)
  values (target_ticket_id, target_technician_id, target_event, target_latitude, target_longitude, target_accuracy, target_justification, target_offline_created_at) returning id into created_event_id;
  update public.tickets set operational_status = next_status, version=version+1 where id = target_ticket_id;
  if order_record.id is not null then
    order_status:=case target_event when 'TRAVEL_STARTED' then 'TRAVELING' when 'ARRIVAL' then 'CHECKED_IN' when 'WORK_STARTED' then 'IN_SERVICE' end;
    order_event:=case target_event when 'TRAVEL_STARTED' then 'TRAVELING' when 'ARRIVAL' then 'CHECK_IN' when 'WORK_STARTED' then 'SERVICE_STARTED' end;
    update public.service_orders set status=order_status,checked_in_at=case when target_event='ARRIVAL' then clock_timestamp() else checked_in_at end,updated_by=auth.uid() where id=order_record.id;
    update public.field_service_route_stops set travel_started_at=case when target_event='TRAVEL_STARTED' then clock_timestamp() else travel_started_at end,checked_in_at=case when target_event='ARRIVAL' then clock_timestamp() else checked_in_at end where service_order_id=order_record.id;
    insert into public.service_order_events(service_order_id,organization_id,event_type,actor_id,details) values(order_record.id,ticket_organization_id,order_event,auth.uid(),jsonb_build_object('ticket_field_event_id',created_event_id,'source','FIELD'));
  end if;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(ticket_organization_id,auth.uid(),'TICKET_FIELD_EVENT_RECORDED','ticket',target_ticket_id,jsonb_build_object('event',target_event,'field_event_id',created_event_id,'service_order_id',order_record.id),'FIELD');
  return created_event_id;
end;
$$;

revoke all on function public.record_ticket_field_event(uuid, public.field_event_type, numeric, numeric, numeric, text, timestamptz) from public;
grant execute on function public.record_ticket_field_event(uuid, public.field_event_type, numeric, numeric, numeric, text, timestamptz) to authenticated;
