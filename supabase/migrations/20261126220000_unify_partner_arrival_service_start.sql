-- A ação "Cheguei ao local" mantém os dois eventos históricos necessários,
-- mas inicia o atendimento na mesma transação para reduzir interações do técnico.
create or replace function public.arrive_and_start_partner_service_order(
  target_token text,
  target_code text,
  target_location jsonb default null,
  target_report text default null,
  target_evidence jsonb default '[]'::jsonb,
  target_signature_name text default null,
  target_signature_data_url text default null
)
returns void language plpgsql security definer set search_path=public as $$
declare
  access_record public.service_order_partner_accesses%rowtype;
  order_record public.service_orders%rowtype;
  submission_id uuid;
begin
  access_record := public.assert_partner_access(target_token, target_code);
  select * into order_record from public.service_orders where id = access_record.service_order_id for update;
  if order_record.status <> 'TRAVELING' then raise exception 'PARTNER_EVENT_INVALID_STATE'; end if;
  update public.service_orders set status = 'IN_SERVICE', checked_in_at = clock_timestamp(), updated_by = null where id = order_record.id;
  insert into public.service_order_partner_submissions(partner_access_id, organization_id, checked_in_at, checked_in_location, evidence)
    values(access_record.id, access_record.organization_id, clock_timestamp(), target_location, target_evidence) returning id into submission_id;
  insert into public.service_order_events(service_order_id, organization_id, event_type, actor_id, details)
    values(order_record.id, order_record.organization_id, 'CHECK_IN', null, jsonb_build_object('source','PARTNER_ACCESS','submission_id',submission_id));
  insert into public.service_order_events(service_order_id, organization_id, event_type, actor_id, details)
    values(order_record.id, order_record.organization_id, 'SERVICE_STARTED', null, jsonb_build_object('source','PARTNER_ACCESS','submission_id',submission_id,'combined_action',true));
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
    values(order_record.organization_id, null, 'SERVICE_ORDER_PARTNER_EVENT', 'service_order', order_record.id, jsonb_build_object('event','CHECK_IN','submission_id',submission_id,'combined_action',true), 'PARTNER');
end;
$$;

revoke all on function public.arrive_and_start_partner_service_order(text,text,jsonb,jsonb,text,text,text) from public;
grant execute on function public.arrive_and_start_partner_service_order(text,text,jsonb,jsonb,text,text,text) to anon;
