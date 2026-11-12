-- Additive context for the public technician view.
-- The token/code validation remains delegated to assert_partner_access.
-- audit:allow-drop-function-replacement (signature return shape changed; no data is removed)
drop function if exists public.get_partner_service_order_context(text, text);

create or replace function public.get_partner_service_order_context(target_token text, target_code text)
returns table(
  service_order_id uuid,
  order_number text,
  ticket_number text,
  title text,
  scheduled_at timestamptz,
  status text,
  location_name text,
  location_address text,
  local_contact_name text,
  local_contact_phone text,
  materials jsonb
)
language plpgsql security definer set search_path = public as $$
declare access_record public.service_order_partner_accesses%rowtype;
begin
  access_record := public.assert_partner_access(target_token, target_code);
  return query
    select
      so.id,
      so.order_number,
      t.ticket_number,
      t.title,
      so.scheduled_at,
      so.status,
      loc.name,
      concat_ws(', ', loc.street, loc.street_number, loc.complement, loc.district, loc.city, loc.state_code),
      coalesce(so.local_contact_name, contact.name),
      coalesce(so.local_contact_phone, coalesce(contact.mobile, contact.phone)),
      coalesce((select jsonb_agg(jsonb_build_object('name', tm.material_name, 'quantity', tm.quantity, 'unit', tm.unit) order by tm.created_at)
        from public.ticket_materials tm where tm.ticket_id = t.id), '[]'::jsonb)
    from public.service_orders so
    join public.tickets t on t.id = so.ticket_id
    join public.customer_locations loc on loc.id = so.location_id
    left join public.location_contacts contact on contact.id = t.requester_contact_id
    where so.id = access_record.service_order_id;
end;
$$;

revoke all on function public.get_partner_service_order_context(text, text) from public;
grant execute on function public.get_partner_service_order_context(text, text) to anon;
