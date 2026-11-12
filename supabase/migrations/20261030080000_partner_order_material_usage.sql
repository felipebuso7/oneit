-- Consumo real de materiais por OS, vinculado à LPU da organização.
create table public.service_order_material_usages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  service_order_id uuid not null references public.service_orders(id) on delete restrict,
  lpu_item_id uuid not null references public.field_service_lpu_items(id) on delete restrict,
  material_code text not null,
  material_name text not null,
  unit text not null,
  quantity numeric(12,3) not null check (quantity > 0 and quantity <= 100000),
  created_at timestamptz not null default now(),
  unique (service_order_id, lpu_item_id)
);

create index service_order_material_usages_org_order_idx
  on public.service_order_material_usages (organization_id, service_order_id);

alter table public.service_order_material_usages enable row level security;
create policy "members read service order materials"
  on public.service_order_material_usages for select to authenticated
  using (public.is_organization_member(organization_id));

create or replace function public.get_partner_service_order_materials(target_token text, target_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  access_record public.service_order_partner_accesses%rowtype;
  order_record public.service_orders%rowtype;
begin
  access_record := public.assert_partner_access(target_token, target_code);
  select * into order_record from public.service_orders where id = access_record.service_order_id;
  if order_record.id is null then raise exception 'PARTNER_ORDER_NOT_FOUND'; end if;
  return jsonb_build_object(
    'catalog', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'code', m.code, 'name', m.description, 'unit', m.unit) order by m.description)
      from public.field_service_lpu_items m
      where m.active and m.kind = 'material' and m.organization_id = order_record.organization_id
        and m.valid_from <= current_date and (m.valid_until is null or m.valid_until >= current_date)
    ), '[]'::jsonb),
    'used', coalesce((
      select jsonb_agg(jsonb_build_object('lpuItemId', u.lpu_item_id, 'code', u.material_code, 'name', u.material_name, 'unit', u.unit, 'quantity', u.quantity) order by u.created_at)
      from public.service_order_material_usages u
      where u.service_order_id = order_record.id and u.organization_id = order_record.organization_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.save_partner_service_order_materials(target_token text, target_code text, target_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  access_record public.service_order_partner_accesses%rowtype;
  order_record public.service_orders%rowtype;
  item jsonb;
  material_record public.field_service_lpu_items%rowtype;
  lpu_item_uuid uuid;
  item_quantity numeric;
  seen_ids uuid[] := '{}';
begin
  access_record := public.assert_partner_access(target_token, target_code);
  select * into order_record from public.service_orders where id = access_record.service_order_id for update;
  if order_record.id is null then raise exception 'PARTNER_ORDER_NOT_FOUND'; end if;
  if order_record.status <> 'CHECKED_IN' then raise exception 'PARTNER_MATERIAL_INVALID_STATE'; end if;
  if target_items is null or jsonb_typeof(target_items) <> 'array' then
    raise exception 'PARTNER_MATERIAL_INVALID';
  end if;
  if jsonb_array_length(target_items) > 30 then
    raise exception 'PARTNER_MATERIAL_INVALID';
  end if;

  -- Validar tudo antes de substituir o consumo anterior. Qualquer erro reverte a transação.
  for item in select value from jsonb_array_elements(target_items) loop
    if jsonb_typeof(item) <> 'object'
      or coalesce(item->>'lpuItemId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or coalesce(item->>'quantity', '') !~ '^[0-9]+(\.[0-9]{1,3})?$' then
      raise exception 'PARTNER_MATERIAL_INVALID';
    end if;
    lpu_item_uuid := (item->>'lpuItemId')::uuid;
    item_quantity := (item->>'quantity')::numeric;
    if item_quantity <= 0 or item_quantity > 100000 or lpu_item_uuid = any(seen_ids) then
      raise exception 'PARTNER_MATERIAL_INVALID';
    end if;
    seen_ids := array_append(seen_ids, lpu_item_uuid);
    select * into material_record from public.field_service_lpu_items
      where id = lpu_item_uuid and kind = 'material' and organization_id = order_record.organization_id
        and ((active and valid_from <= current_date and (valid_until is null or valid_until >= current_date)) or exists (
          select 1 from public.service_order_material_usages existing
          where existing.service_order_id = order_record.id and existing.lpu_item_id = lpu_item_uuid
        ));
    if material_record.id is null then raise exception 'PARTNER_MATERIAL_INVALID_SELECTION'; end if;
  end loop;

  delete from public.service_order_material_usages where service_order_id = order_record.id;
  for item in select value from jsonb_array_elements(target_items) loop
    lpu_item_uuid := (item->>'lpuItemId')::uuid;
    select * into material_record from public.field_service_lpu_items where id = lpu_item_uuid;
    insert into public.service_order_material_usages
      (organization_id, service_order_id, lpu_item_id, material_code, material_name, unit, quantity)
    values
      (order_record.organization_id, order_record.id, material_record.id, material_record.code, material_record.description, material_record.unit, (item->>'quantity')::numeric);
  end loop;

  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values(order_record.organization_id, null, 'SERVICE_ORDER_MATERIALS_RECORDED', 'service_order', order_record.id,
    jsonb_build_object('count', jsonb_array_length(target_items), 'materials', target_items), 'PARTNER');
end;
$$;

revoke all on function public.get_partner_service_order_materials(text,text), public.save_partner_service_order_materials(text,text,jsonb) from public;
grant execute on function public.get_partner_service_order_materials(text,text), public.save_partner_service_order_materials(text,text,jsonb) to anon, authenticated;
