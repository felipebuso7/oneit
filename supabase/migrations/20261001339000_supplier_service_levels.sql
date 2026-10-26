create type public.supplier_sla_unit as enum ('MINUTES','PERCENTAGE','HOURS','COUNT');
create type public.supplier_sla_record_status as enum ('COMPLIANT','BREACHED','IN_TREATMENT','RESOLVED');

create table public.supplier_service_levels (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  service_name text not null check(length(trim(service_name)) between 2 and 240),
  metric_name text not null check(length(trim(metric_name)) between 2 and 240),
  target_value numeric(12,2) not null check(target_value >= 0),
  unit public.supplier_sla_unit not null,
  measurement_frequency text not null check(measurement_frequency in ('PER_EVENT','MONTHLY','QUARTERLY')),
  contract_reference text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete set null,
  unique(supplier_id, service_name, metric_name)
);

create table public.supplier_sla_records (
  id uuid primary key default gen_random_uuid(),
  service_level_id uuid not null references public.supplier_service_levels(id) on delete restrict,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  period_start date,
  period_end date,
  measured_value numeric(12,2) not null check(measured_value >= 0),
  compliant boolean not null,
  source_reference text,
  incident_reference text,
  action_description text,
  action_owner_id uuid references public.user_profiles(id) on delete set null,
  action_due_date date,
  resolved_at timestamptz,
  status public.supplier_sla_record_status not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete set null,
  check(period_end is null or period_start is null or period_end >= period_start),
  check((status in ('BREACHED','IN_TREATMENT','RESOLVED')) = (compliant = false))
);

create index supplier_service_levels_org_idx on public.supplier_service_levels(organization_id,active);
create index supplier_sla_records_org_status_idx on public.supplier_sla_records(organization_id,status,created_at desc);
alter table public.supplier_service_levels enable row level security;
alter table public.supplier_sla_records enable row level security;
create policy "members read supplier service levels" on public.supplier_service_levels for select to authenticated using(public.is_organization_member(organization_id));
create policy "managers manage supplier service levels" on public.supplier_service_levels for all to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[])) with check(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]));
create policy "members read supplier sla records" on public.supplier_sla_records for select to authenticated using(public.is_organization_member(organization_id));
create policy "managers manage supplier sla records" on public.supplier_sla_records for all to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[])) with check(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]));
