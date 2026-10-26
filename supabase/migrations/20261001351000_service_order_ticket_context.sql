create or replace function public.create_service_order(target_ticket_id uuid,target_contract_id uuid default null,target_location_id uuid default null,target_technician_id uuid default null,target_supplier_id uuid default null,target_scheduled_at timestamptz default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare ticket_record public.tickets%rowtype; order_id uuid; effective_contract_id uuid; effective_location_id uuid;
begin
  select * into ticket_record from public.tickets where id=target_ticket_id for update;
  if ticket_record.id is null or not public.has_organization_role(ticket_record.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]) then raise exception 'SERVICE_ORDER_NOT_AUTHORIZED'; end if;
  effective_contract_id:=coalesce(target_contract_id,ticket_record.contract_id);
  effective_location_id:=coalesce(target_location_id,ticket_record.location_id);
  if effective_location_id is null then raise exception 'SERVICE_ORDER_LOCATION_REQUIRED'; end if;
  if target_technician_id is not null and not exists(select 1 from public.technicians where id=target_technician_id and organization_id=ticket_record.organization_id and active) then raise exception 'SERVICE_ORDER_INVALID_TECHNICIAN'; end if;
  insert into public.service_orders(organization_id,ticket_id,contract_id,location_id,technician_id,supplier_id,scheduled_at,created_by,updated_by)
  values(ticket_record.organization_id,ticket_record.id,effective_contract_id,effective_location_id,target_technician_id,target_supplier_id,target_scheduled_at,auth.uid(),auth.uid()) returning id into order_id;
  insert into public.service_order_events(service_order_id,organization_id,event_type,actor_id,details) values(order_id,ticket_record.organization_id,'CREATED',auth.uid(),jsonb_build_object('ticket_id',ticket_record.id,'location_id',effective_location_id,'contract_id',effective_contract_id));
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(ticket_record.organization_id,auth.uid(),'SERVICE_ORDER_CREATED','service_order',order_id,jsonb_build_object('ticket_id',ticket_record.id,'location_id',effective_location_id),'WEB');
  return order_id;
end; $$;

revoke all on function public.create_service_order(uuid,uuid,uuid,uuid,uuid,timestamptz) from public;
grant execute on function public.create_service_order(uuid,uuid,uuid,uuid,uuid,timestamptz) to authenticated;
