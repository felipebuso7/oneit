create table if not exists public.contract_travel_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  contract_id uuid not null references public.contracts(id) on delete restrict,
  lpu_item_id uuid references public.field_service_lpu_items(id) on delete restrict,
  mode text not null check (mode in ('INCLUDED','NON_BILLABLE','FIXED','PER_KM')),
  return_mode text not null default 'NONE' check (return_mode in ('NONE','ESTIMATED_RETURN','ACTUAL_RETURN')),
  fixed_amount numeric(14,2) check (fixed_amount is null or fixed_amount >= 0),
  rate_per_km numeric(14,4) check (rate_per_km is null or rate_per_km >= 0),
  franchise_km numeric(14,3) not null default 0 check (franchise_km >= 0),
  min_amount numeric(14,2) check (min_amount is null or min_amount >= 0),
  max_amount numeric(14,2) check (max_amount is null or max_amount >= 0),
  valid_from date not null default current_date,
  valid_until date,
  approval_required boolean not null default true,
  active boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete set null,
  check (valid_until is null or valid_until >= valid_from),
  check (max_amount is null or min_amount is null or max_amount >= min_amount)
);
create unique index if not exists contract_travel_pricing_rules_active_idx on public.contract_travel_pricing_rules(contract_id) where active;
create index if not exists contract_travel_pricing_rules_scope_idx on public.contract_travel_pricing_rules(organization_id, contract_id, valid_from);
alter table public.contract_travel_pricing_rules enable row level security;
create policy "members read travel pricing rules" on public.contract_travel_pricing_rules for select to authenticated using (public.is_organization_member(organization_id));
create policy "admins manage travel pricing rules" on public.contract_travel_pricing_rules for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]));

create table if not exists public.service_order_travel_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  service_order_id uuid not null unique references public.service_orders(id) on delete restrict,
  contract_id uuid references public.contracts(id) on delete restrict,
  pricing_rule_id uuid references public.contract_travel_pricing_rules(id) on delete restrict,
  distance_one_way_km numeric(14,3) not null check (distance_one_way_km >= 0),
  return_km numeric(14,3) not null default 0 check (return_km >= 0),
  considered_km numeric(14,3) not null check (considered_km >= 0),
  billable_km numeric(14,3) not null default 0 check (billable_km >= 0),
  calculated_amount numeric(14,2) not null default 0 check (calculated_amount >= 0),
  approved_amount numeric(14,2) check (approved_amount is null or approved_amount >= 0),
  status text not null default 'PENDING' check (status in ('PENDING','CALCULATED','AWAITING_APPROVAL','APPROVED','REJECTED')),
  provider text,
  route_seconds integer,
  calculation_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.user_profiles(id) on delete set null
);
alter table public.service_order_travel_snapshots enable row level security;
create policy "members read travel snapshots" on public.service_order_travel_snapshots for select to authenticated using (public.is_organization_member(organization_id));
create policy "finance manage travel snapshots" on public.service_order_travel_snapshots for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]));
