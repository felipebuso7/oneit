-- Aplica uma composição vigente à OS, expandindo seus itens e congelando os preços.
-- Migration aditiva; não remove nem altera estruturas existentes.

create or replace function public.add_field_service_order_lpu_composition(
  target_service_order_id uuid,
  target_composition_id uuid,
  target_quantity numeric
)
returns integer language plpgsql security definer set search_path = public as $$
declare
  order_record public.service_orders%rowtype;
  composition public.field_service_lpu_compositions%rowtype;
  line record;
  applied_count integer := 0;
  effective_quantity numeric;
begin
  select * into order_record from public.service_orders where id = target_service_order_id for update;
  if order_record.id is null or not public.has_organization_role(order_record.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]) then
    raise exception 'LPU_NOT_AUTHORIZED';
  end if;
  if order_record.status not in ('COMPLETED','VALIDATED') then raise exception 'LPU_INVALID_ORDER_STATE'; end if;
  if target_quantity is null or target_quantity <= 0 or target_quantity > 100000 then raise exception 'LPU_INVALID_QUANTITY'; end if;

  select * into composition
  from public.field_service_lpu_compositions
  where id = target_composition_id
    and organization_id = order_record.organization_id
    and active
    and valid_from <= current_date
    and (valid_until is null or valid_until >= current_date);
  if composition.id is null then raise exception 'LPU_COMPOSITION_NOT_FOUND'; end if;

  for line in
    select i.id as lpu_item_id, i.code, i.description, i.unit, cl.quantity, cl.unit_price
    from public.field_service_lpu_composition_lines cl
    join public.field_service_lpu_items i on i.id = cl.lpu_item_id
    where cl.composition_id = composition.id
  loop
    effective_quantity := line.quantity * target_quantity;
    insert into public.field_service_order_lpu_lines
      (organization_id, service_order_id, lpu_item_id, lpu_code, description, unit, quantity, unit_price, created_by)
    values
      (order_record.organization_id, order_record.id, line.lpu_item_id, line.code, line.description, line.unit, effective_quantity, line.unit_price, auth.uid())
    on conflict (service_order_id, lpu_code) do update
      set quantity = public.field_service_order_lpu_lines.quantity + excluded.quantity,
          lpu_item_id = excluded.lpu_item_id,
          description = excluded.description,
          unit = excluded.unit,
          unit_price = excluded.unit_price;
    applied_count := applied_count + 1;
  end loop;
  if applied_count = 0 then raise exception 'LPU_COMPOSITION_LINES_REQUIRED'; end if;
  return applied_count;
end;
$$;

revoke all on function public.add_field_service_order_lpu_composition(uuid, uuid, numeric) from public;
grant execute on function public.add_field_service_order_lpu_composition(uuid, uuid, numeric) to authenticated;
