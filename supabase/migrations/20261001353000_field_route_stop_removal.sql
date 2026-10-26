create or replace function public.remove_service_order_from_field_route(target_route_stop_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare stop_record public.field_service_route_stops%rowtype; route_record public.field_service_routes%rowtype;
begin
  select * into stop_record from public.field_service_route_stops where id=target_route_stop_id for update;
  if stop_record.id is null then raise exception 'FIELD_ROUTE_STOP_NOT_FOUND'; end if;
  select * into route_record from public.field_service_routes where id=stop_record.route_id for update;
  if route_record.id is null or not public.has_organization_role(route_record.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]) then raise exception 'FIELD_ROUTE_NOT_AUTHORIZED'; end if;
  if route_record.status in('COMPLETED','CANCELLED') or stop_record.travel_started_at is not null or stop_record.checked_in_at is not null then raise exception 'FIELD_ROUTE_STOP_CANNOT_REMOVE'; end if;
  delete from public.field_service_route_stops where id=stop_record.id;
  update public.field_service_route_stops set sequence_number=sequence_number-1 where route_id=route_record.id and sequence_number>stop_record.sequence_number;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
  values(route_record.organization_id,auth.uid(),'FIELD_ROUTE_STOP_REMOVED','field_service_route_stop',stop_record.id,jsonb_build_object('route_id',route_record.id,'service_order_id',stop_record.service_order_id),'WEB');
end; $$;

revoke all on function public.remove_service_order_from_field_route(uuid) from public;
grant execute on function public.remove_service_order_from_field_route(uuid) to authenticated;
