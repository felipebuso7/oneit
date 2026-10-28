-- Expõe somente o histórico operacional da OS ao link temporário do técnico.
-- A função valida o token/código antes de consultar qualquer dado.
create or replace function public.get_partner_service_order_timeline(target_token text, target_code text)
returns table(travel_started_at timestamptz, checked_in_at timestamptz, checked_out_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare
  access_record public.service_order_partner_accesses%rowtype;
begin
  access_record := public.assert_partner_access(target_token, target_code);
  return query
    select
      (select event.occurred_at from public.service_order_events event where event.service_order_id = access_record.service_order_id and event.event_type = 'TRAVELING' order by event.occurred_at asc limit 1),
      order_record.checked_in_at,
      order_record.checked_out_at
    from public.service_orders order_record
    where order_record.id = access_record.service_order_id;
end;
$$;

revoke all on function public.get_partner_service_order_timeline(text, text) from public;
grant execute on function public.get_partner_service_order_timeline(text, text) to anon;
