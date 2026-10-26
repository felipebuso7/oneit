create or replace function public.dispatch_service_order(target_order_id uuid,target_technician_id uuid,target_scheduled_at timestamptz default null)
returns void language plpgsql security definer set search_path=public as $$
declare order_record public.service_orders%rowtype; ticket_record public.tickets%rowtype; effective_schedule timestamptz;
begin
  select * into order_record from public.service_orders where id=target_order_id for update;
  if order_record.id is null or not public.has_organization_role(order_record.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]) then raise exception 'SERVICE_ORDER_NOT_AUTHORIZED'; end if;
  if order_record.status not in('TRIAGE','DISPATCHED') then raise exception 'SERVICE_ORDER_INVALID_STATE'; end if;
  if not exists(select 1 from public.technicians where id=target_technician_id and organization_id=order_record.organization_id and active) then raise exception 'SERVICE_ORDER_INVALID_TECHNICIAN'; end if;
  select * into ticket_record from public.tickets where id=order_record.ticket_id for update;
  if ticket_record.id is null or ticket_record.operational_status not in('NEW','TRIAGE','AWAITING_SCHEDULING','SCHEDULED','ASSIGNED') then raise exception 'SERVICE_ORDER_TICKET_INVALID_STATE'; end if;
  effective_schedule:=coalesce(target_scheduled_at,order_record.scheduled_at);
  update public.service_orders set technician_id=target_technician_id,scheduled_at=effective_schedule,status='DISPATCHED',dispatched_at=clock_timestamp(),updated_by=auth.uid() where id=order_record.id;
  update public.tickets set assigned_technician_id=target_technician_id,scheduled_at=effective_schedule,operational_status='ASSIGNED',version=version+1 where id=order_record.ticket_id;
  insert into public.service_order_events(service_order_id,organization_id,event_type,actor_id,details) values(order_record.id,order_record.organization_id,'DISPATCHED',auth.uid(),jsonb_build_object('technician_id',target_technician_id,'scheduled_at',effective_schedule));
  insert into public.ticket_status_history(ticket_id,organization_id,dimension,previous_status,next_status,actor_id,reason) values(order_record.ticket_id,order_record.organization_id,'OPERATIONAL',ticket_record.operational_status::text,'ASSIGNED',auth.uid(),'Despacho pela ordem de serviço '||order_record.order_number);
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(order_record.organization_id,auth.uid(),'SERVICE_ORDER_DISPATCHED','service_order',order_record.id,jsonb_build_object('ticket_id',order_record.ticket_id,'technician_id',target_technician_id,'scheduled_at',effective_schedule),'WEB');
end; $$;

revoke all on function public.dispatch_service_order(uuid,uuid,timestamptz) from public;
grant execute on function public.dispatch_service_order(uuid,uuid,timestamptz) to authenticated;
