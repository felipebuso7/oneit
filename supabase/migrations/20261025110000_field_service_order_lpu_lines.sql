create table public.field_service_order_lpu_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  service_order_id uuid not null references public.service_orders(id) on delete restrict,
  lpu_item_id uuid references public.field_service_lpu_items(id) on delete restrict,
  lpu_code text not null,
  description text not null,
  unit text not null,
  quantity numeric(12,3) not null check (quantity > 0 and quantity <= 100000),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(service_order_id, lpu_code)
);

create index field_service_order_lpu_lines_order_idx on public.field_service_order_lpu_lines(service_order_id, created_at);
alter table public.field_service_order_lpu_lines enable row level security;
create policy "members read field service order lpu" on public.field_service_order_lpu_lines for select to authenticated using (public.is_organization_member(organization_id));
create policy "managers manage field service order lpu" on public.field_service_order_lpu_lines for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]));

create or replace function public.add_field_service_order_lpu_line(target_service_order_id uuid, target_lpu_item_id uuid, target_quantity numeric)
returns uuid language plpgsql security definer set search_path = public as $$
declare order_record public.service_orders%rowtype; item public.field_service_lpu_items%rowtype; line_id uuid;
begin
  select * into order_record from public.service_orders where id = target_service_order_id for update;
  if order_record.id is null or not public.has_organization_role(order_record.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]) then raise exception 'LPU_NOT_AUTHORIZED'; end if;
  if order_record.status not in ('COMPLETED','VALIDATED') then raise exception 'LPU_INVALID_ORDER_STATE'; end if;
  if target_quantity is null or target_quantity <= 0 or target_quantity > 100000 then raise exception 'LPU_INVALID_QUANTITY'; end if;
  select * into item from public.field_service_lpu_items where id = target_lpu_item_id and organization_id = order_record.organization_id and active and valid_from <= current_date and (valid_until is null or valid_until >= current_date);
  if item.id is null then raise exception 'LPU_ITEM_NOT_FOUND'; end if;
  insert into public.field_service_order_lpu_lines(organization_id, service_order_id, lpu_item_id, lpu_code, description, unit, quantity, unit_price, created_by)
  values(order_record.organization_id, order_record.id, item.id, item.code, item.description, item.unit, target_quantity, item.unit_price, auth.uid())
  on conflict (service_order_id, lpu_code) do update set quantity = excluded.quantity, lpu_item_id = excluded.lpu_item_id, description = excluded.description, unit = excluded.unit, unit_price = excluded.unit_price
  returning id into line_id;
  return line_id;
end;
$$;
revoke all on function public.add_field_service_order_lpu_line(uuid, uuid, numeric) from public;
grant execute on function public.add_field_service_order_lpu_line(uuid, uuid, numeric) to authenticated;
