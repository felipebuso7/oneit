-- Consolida eventos e métricas de atendimento no snapshot imutável da RTO.
create or replace function public.generate_field_service_rto(target_queue_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare item public.field_service_review_queue%rowtype; order_record public.service_orders%rowtype; submission_record public.service_order_partner_submissions%rowtype; report_id uuid; snapshot_value jsonb; next_version integer; metric public.service_order_travel_metrics%rowtype;
begin
  select * into item from public.field_service_review_queue where id=target_queue_id for update;
  if item.id is null or item.status <> 'APPROVED' then raise exception 'RTO_REVIEW_REQUIRED'; end if;
  if not public.has_organization_role(item.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]) or not exists(select 1 from public.user_profiles where id=auth.uid() and active) then raise exception 'RTO_NOT_AUTHORIZED'; end if;
  select * into order_record from public.service_orders where id=item.service_order_id;
  select * into submission_record from public.service_order_partner_submissions where id=item.submission_id;
  select * into metric from public.service_order_travel_metrics where service_order_id=order_record.id;
  if order_record.id is null or submission_record.id is null then raise exception 'RTO_DATA_INCOMPLETE'; end if;
  select coalesce(max(report_version),0)+1 into next_version from public.field_service_rto_reports where service_order_id=order_record.id;
  snapshot_value := jsonb_build_object(
    'service_order_id',order_record.id,'ticket_id',order_record.ticket_id,'order_number',order_record.order_number,'status',order_record.status,
    'ticket_number',(select t.ticket_number from public.tickets t where t.id=order_record.ticket_id),'title',(select t.title from public.tickets t where t.id=order_record.ticket_id),
    'customer_name',(select c.name from public.customers c join public.tickets t on t.customer_id=c.id where t.id=order_record.ticket_id),
    'location_name',(select l.name from public.customer_locations l where l.id=order_record.location_id),
    'location_address',(select nullif(trim(concat_ws(', ',l.street,l.street_number,l.complement,l.district,l.city,l.state_code,l.postal_code)),'') from public.customer_locations l where l.id=order_record.location_id),
    'technician_name',(select tech.full_name from public.technicians tech where tech.id=order_record.technician_id),
    'scheduled_at',order_record.scheduled_at,'checked_in_at',order_record.checked_in_at,'checked_out_at',order_record.checked_out_at,
    'ticket_opened_at',(select t.created_at from public.tickets t where t.id=order_record.ticket_id),
    'travel_started_at',(select captured_at from public.service_order_location_events where service_order_id=order_record.id and event_type='TRAVEL_STARTED' order by received_at limit 1),
    'accepted_at',(select min(created_at) from public.service_order_events where service_order_id=order_record.id and event_type in ('ACCEPTED','DISPATCHED')),
    'service_started_at',(select min(created_at) from public.service_order_events where service_order_id=order_record.id and event_type='SERVICE_STARTED'),
    'validation_submitted_at',item.created_at,
    'check_in_location',submission_record.checked_in_location,'check_out_location',submission_record.checked_out_location,
    'distance_one_way_km',case when metric.straight_line_distance_m is not null then metric.straight_line_distance_m/1000.0 else null end,
    'estimated_return_km',case when metric.straight_line_distance_m is not null then metric.straight_line_distance_m/1000.0 else null end,
    'estimated_total_km',case when metric.straight_line_distance_m is not null then metric.straight_line_distance_m/500.0 else null end,
    'travel_calculation_status',coalesce(metric.status,'PENDING'),'straight_line_distance_m',metric.straight_line_distance_m,'distance_method',coalesce(metric.distance_method,'PENDING_ROAD_ROUTE'),
    'travel_duration_seconds',metric.duration_seconds,'service_duration_seconds',case when order_record.checked_in_at is not null and order_record.checked_out_at is not null then greatest(0,extract(epoch from order_record.checked_out_at-order_record.checked_in_at)::integer) else null end,
    'execution_report',submission_record.execution_report,'customer_signature_name',submission_record.customer_signature_name,'customer_signature_data_url',submission_record.customer_signature_data_url,'evidence',coalesce(submission_record.evidence,'[]'::jsonb),
    'lpu_lines',coalesce((select jsonb_agg(jsonb_build_object('code',lpu_code,'description',description,'unit',unit,'quantity',quantity,'unit_price',unit_price,'total',round(quantity*unit_price,2)) order by created_at) from public.field_service_order_lpu_lines where service_order_id=order_record.id),'[]'::jsonb)
  );
  insert into public.field_service_rto_reports(organization_id,service_order_id,ticket_id,report_version,snapshot,generated_by) values(item.organization_id,order_record.id,order_record.ticket_id,next_version,snapshot_value,auth.uid()) on conflict(service_order_id) do update set report_version=excluded.report_version,snapshot=excluded.snapshot,generated_by=excluded.generated_by,generated_at=clock_timestamp() returning id into report_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(item.organization_id,auth.uid(),'FIELD_SERVICE_RTO_GENERATED','service_order',order_record.id,jsonb_build_object('report_id',report_id,'version',next_version,'distance_method',coalesce(metric.distance_method,'PENDING_ROAD_ROUTE')),'WEB');
  return report_id;
end; $$;
revoke all on function public.generate_field_service_rto(uuid) from public;
grant execute on function public.generate_field_service_rto(uuid) to authenticated;
