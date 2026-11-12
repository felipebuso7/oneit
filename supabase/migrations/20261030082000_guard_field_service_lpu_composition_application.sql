-- Cada composição pode ser aplicada uma vez por OS. A trava da OS serializa
-- lançamentos concorrentes e evita somar valores duas vezes após reenvio.
create table public.field_service_order_lpu_composition_applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  service_order_id uuid not null references public.service_orders(id) on delete restrict,
  composition_id uuid not null references public.field_service_lpu_compositions(id) on delete restrict,
  multiplier numeric(12,3) not null check (multiplier > 0 and multiplier <= 100000),
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (service_order_id, composition_id)
);

create index field_service_order_lpu_composition_applications_org_order_idx
  on public.field_service_order_lpu_composition_applications (organization_id, service_order_id);
alter table public.field_service_order_lpu_composition_applications enable row level security;
create policy "members read applied lpu compositions"
  on public.field_service_order_lpu_composition_applications for select to authenticated
  using (public.is_organization_member(organization_id));

create or replace function public.add_field_service_order_lpu_composition(
  target_service_order_id uuid, target_composition_id uuid, target_quantity numeric
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
  if target_quantity is null or target_quantity <= 0 or target_quantity > 100000
    or target_quantity <> round(target_quantity, 3) then raise exception 'LPU_INVALID_QUANTITY'; end if;

  select * into composition from public.field_service_lpu_compositions
  where id = target_composition_id and organization_id = order_record.organization_id and active
    and valid_from <= current_date and (valid_until is null or valid_until >= current_date);
  if composition.id is null then raise exception 'LPU_COMPOSITION_NOT_FOUND'; end if;
  if exists (select 1 from public.field_service_order_lpu_composition_applications
    where service_order_id = order_record.id and composition_id = composition.id) then
    raise exception 'LPU_COMPOSITION_ALREADY_APPLIED';
  end if;
  if exists (
    select 1 from public.field_service_lpu_composition_lines cl
    join public.field_service_lpu_items i on i.id = cl.lpu_item_id
    join public.field_service_order_lpu_lines existing
      on existing.service_order_id = order_record.id and existing.lpu_code = i.code
    where cl.composition_id = composition.id
  ) then raise exception 'LPU_COMPOSITION_ITEM_ALREADY_PRICED'; end if;

  insert into public.field_service_order_lpu_composition_applications
    (organization_id, service_order_id, composition_id, multiplier, created_by)
  values (order_record.organization_id, order_record.id, composition.id, target_quantity, auth.uid());

  for line in
    select i.id as lpu_item_id, i.code, i.description, i.unit, cl.quantity, cl.unit_price
    from public.field_service_lpu_composition_lines cl
    join public.field_service_lpu_items i on i.id = cl.lpu_item_id
    where cl.composition_id = composition.id
  loop
    effective_quantity := line.quantity * target_quantity;
    if effective_quantity <= 0 or effective_quantity > 100000
      or effective_quantity <> round(effective_quantity, 3) then raise exception 'LPU_INVALID_QUANTITY'; end if;
    insert into public.field_service_order_lpu_lines
      (organization_id, service_order_id, lpu_item_id, lpu_code, description, unit, quantity, unit_price, created_by)
    values (order_record.organization_id, order_record.id, line.lpu_item_id, line.code,
      line.description, line.unit, effective_quantity, line.unit_price, auth.uid());
    applied_count := applied_count + 1;
  end loop;
  if applied_count = 0 then raise exception 'LPU_COMPOSITION_LINES_REQUIRED'; end if;
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values(order_record.organization_id, auth.uid(), 'FIELD_SERVICE_LPU_COMPOSITION_APPLIED', 'service_order', order_record.id,
    jsonb_build_object('composition_id', composition.id, 'multiplier', target_quantity, 'lines', applied_count), 'WEB');
  return applied_count;
end;
$$;
revoke all on function public.add_field_service_order_lpu_composition(uuid, uuid, numeric) from public;
grant execute on function public.add_field_service_order_lpu_composition(uuid, uuid, numeric) to authenticated;
