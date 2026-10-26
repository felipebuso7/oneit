-- O aceite não inicia deslocamento: ele apenas registra que o técnico assumiu a OS.
alter table public.service_order_events drop constraint if exists service_order_events_event_type_check;
alter table public.service_order_events add constraint service_order_events_event_type_check
  check (event_type in ('CREATED','DISPATCHED','ACCEPTED','TRAVELING','CHECK_IN','SERVICE_STARTED','CHECK_OUT','COMPLETED','VALIDATED','CANCELLED'));

create or replace function public.accept_partner_service_order(target_token text, target_code text)
returns void language plpgsql security definer set search_path=public as $$
declare
  access_record public.service_order_partner_accesses%rowtype;
  order_record public.service_orders%rowtype;
begin
  access_record := public.assert_partner_access(target_token, target_code);
  select * into order_record from public.service_orders where id = access_record.service_order_id for update;
  if order_record.status <> 'DISPATCHED' then raise exception 'PARTNER_ACCEPT_INVALID_STATE'; end if;

  if not exists (
    select 1 from public.service_order_events
    where service_order_id = order_record.id and event_type = 'ACCEPTED' and details->>'source' = 'PARTNER_ACCESS'
  ) then
    insert into public.service_order_events(service_order_id, organization_id, event_type, actor_id, details)
    values(order_record.id, order_record.organization_id, 'ACCEPTED', null, jsonb_build_object('source','PARTNER_ACCESS'));
    insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
    values(order_record.organization_id, null, 'SERVICE_ORDER_PARTNER_ACCEPTED', 'service_order', order_record.id, jsonb_build_object('partner_access_id', access_record.id), 'PARTNER');
  end if;
end;
$$;

revoke all on function public.accept_partner_service_order(text,text) from public;
grant execute on function public.accept_partner_service_order(text,text) to anon;
