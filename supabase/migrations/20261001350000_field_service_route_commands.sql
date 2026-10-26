create or replace function public.create_field_service_route(target_organization_id uuid,target_technician_id uuid,target_route_date date,target_start_location jsonb default '{}'::jsonb,target_end_location jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare route_id uuid;
begin
  if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]) then raise exception 'FIELD_ROUTE_NOT_AUTHORIZED'; end if;
  if not exists(select 1 from public.technicians where id=target_technician_id and organization_id=target_organization_id and active) then raise exception 'FIELD_ROUTE_INVALID_TECHNICIAN'; end if;
  if jsonb_typeof(target_start_location)<>'object' or jsonb_typeof(target_end_location)<>'object' then raise exception 'FIELD_ROUTE_INVALID_LOCATION'; end if;
  insert into public.field_service_routes(organization_id,technician_id,route_date,start_location,end_location,created_by,updated_by)
  values(target_organization_id,target_technician_id,target_route_date,target_start_location,target_end_location,auth.uid(),auth.uid())
  on conflict(organization_id,technician_id,route_date) do update set start_location=excluded.start_location,end_location=excluded.end_location,updated_by=auth.uid()
  returning id into route_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
  values(target_organization_id,auth.uid(),'FIELD_ROUTE_CREATED_OR_UPDATED','field_service_route',route_id,jsonb_build_object('technician_id',target_technician_id,'route_date',target_route_date),'WEB');
  return route_id;
end; $$;

create or replace function public.add_service_order_to_field_route(target_route_id uuid,target_service_order_id uuid,target_planned_start_at timestamptz default null,target_planned_end_at timestamptz default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare route_record public.field_service_routes%rowtype; order_record public.service_orders%rowtype; stop_id uuid; next_position smallint;
begin
  select * into route_record from public.field_service_routes where id=target_route_id for update;
  if route_record.id is null or not public.has_organization_role(route_record.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]) then raise exception 'FIELD_ROUTE_NOT_AUTHORIZED'; end if;
  if route_record.status in('COMPLETED','CANCELLED') then raise exception 'FIELD_ROUTE_INVALID_STATE'; end if;
  select * into order_record from public.service_orders where id=target_service_order_id for update;
  if order_record.id is null or order_record.organization_id<>route_record.organization_id or order_record.technician_id<>route_record.technician_id then raise exception 'FIELD_ROUTE_ORDER_MISMATCH'; end if;
  if order_record.status not in('DISPATCHED','TRAVELING','CHECKED_IN','IN_SERVICE') then raise exception 'FIELD_ROUTE_ORDER_INVALID_STATE'; end if;
  if target_planned_end_at is not null and target_planned_start_at is not null and target_planned_end_at<=target_planned_start_at then raise exception 'FIELD_ROUTE_INVALID_WINDOW'; end if;
  select coalesce(max(sequence_number),0)::smallint+1 into next_position from public.field_service_route_stops where route_id=route_record.id;
  insert into public.field_service_route_stops(route_id,organization_id,service_order_id,sequence_number,planned_start_at,planned_end_at)
  values(route_record.id,route_record.organization_id,order_record.id,next_position,target_planned_start_at,target_planned_end_at) returning id into stop_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
  values(route_record.organization_id,auth.uid(),'FIELD_ROUTE_STOP_ADDED','field_service_route_stop',stop_id,jsonb_build_object('route_id',route_record.id,'service_order_id',order_record.id,'sequence',next_position),'WEB');
  return stop_id;
end; $$;

revoke all on function public.create_field_service_route(uuid,uuid,date,jsonb,jsonb),public.add_service_order_to_field_route(uuid,uuid,timestamptz,timestamptz) from public;
grant execute on function public.create_field_service_route(uuid,uuid,date,jsonb,jsonb),public.add_service_order_to_field_route(uuid,uuid,timestamptz,timestamptz) to authenticated;
