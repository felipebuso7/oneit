-- Expõe apenas o progresso e a validade do acesso validado, sem consultar dados de outros links.
create or replace function public.get_partner_access_progress(target_token text, target_code text)
returns table(expires_at timestamptz, accepted boolean)
language plpgsql security definer set search_path = public as $$
declare
  access_record public.service_order_partner_accesses%rowtype;
begin
  access_record := public.assert_partner_access(target_token, target_code);
  return query select access_record.expires_at, exists (
    select 1 from public.service_order_events event
    where event.service_order_id = access_record.service_order_id
      and event.event_type = 'ACCEPTED'
      and event.details->>'partner_access_id' = access_record.id::text
  );
end;
$$;

-- O aceite pertence ao link usado, para que um novo acesso não herde aceite de outra atribuição.
create or replace function public.accept_partner_service_order(target_token text, target_code text)
returns void language plpgsql security definer set search_path = public as $$
declare
  access_record public.service_order_partner_accesses%rowtype;
  order_record public.service_orders%rowtype;
begin
  access_record := public.assert_partner_access(target_token, target_code);
  select * into order_record from public.service_orders where id = access_record.service_order_id for update;
  if order_record.status <> 'DISPATCHED' then raise exception 'PARTNER_ACCEPT_INVALID_STATE'; end if;
  if not exists (
    select 1 from public.service_order_events event
    where event.service_order_id = order_record.id and event.event_type = 'ACCEPTED'
      and event.details->>'partner_access_id' = access_record.id::text
  ) then
    insert into public.service_order_events(service_order_id, organization_id, event_type, actor_id, details)
    values(order_record.id, order_record.organization_id, 'ACCEPTED', null, jsonb_build_object('source','PARTNER_ACCESS','partner_access_id',access_record.id));
    insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
    values(order_record.organization_id, null, 'SERVICE_ORDER_PARTNER_ACCEPTED', 'service_order', order_record.id, jsonb_build_object('partner_access_id',access_record.id), 'PARTNER');
  end if;
end;
$$;

revoke all on function public.get_partner_access_progress(text,text) from public;
grant execute on function public.get_partner_access_progress(text,text) to anon;
revoke all on function public.accept_partner_service_order(text,text) from public;
grant execute on function public.accept_partner_service_order(text,text) to anon;
