-- Evolução do ciclo financeiro inspirada no OneFlow:
-- cada revisão do BM é imutável e mantém o snapshot usado no cálculo.
create table public.measurement_sheet_versions (
  id uuid primary key default gen_random_uuid(),
  measurement_sheet_id uuid not null references public.measurement_sheets(id) on delete restrict,
  billing_period_id uuid not null references public.billing_periods(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  version integer not null check (version > 0),
  status text not null default 'DRAFT' check (status in ('DRAFT','ISSUED','CONTESTED','SUPERSEDED','APPROVED','SENT_TO_TAX','CLOSED')),
  source_version_id uuid references public.measurement_sheet_versions(id) on delete restrict,
  total_orders integer not null default 0 check (total_orders >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  calculation_hash text not null,
  snapshot jsonb not null default '{}'::jsonb,
  issued_at timestamptz,
  issued_by uuid references public.user_profiles(id) on delete set null,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (measurement_sheet_id, version),
  unique (measurement_sheet_id, calculation_hash),
  check ((status in ('ISSUED','CONTESTED','SUPERSEDED','APPROVED','SENT_TO_TAX','CLOSED')) = (issued_at is not null and issued_by is not null))
);

create table public.measurement_sheet_events (
  id uuid primary key default gen_random_uuid(),
  measurement_sheet_id uuid not null references public.measurement_sheets(id) on delete restrict,
  measurement_sheet_version_id uuid references public.measurement_sheet_versions(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  event_type text not null check (event_type in ('CREATED','CALCULATED','ISSUED','CONTESTATION_OPENED','CONTESTATION_RESOLVED','APPROVED','SENT_TO_TAX','CLOSED','RESENT')),
  actor_id uuid references public.user_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.fiscal_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  competence date not null,
  batch_number text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','READY','SENT','CLOSED')),
  measurement_sheet_ids uuid[] not null default '{}',
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  pdf_hash text,
  sent_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, competence),
  unique (organization_id, batch_number),
  check ((status in ('SENT','CLOSED')) = (sent_at is not null))
);

create index measurement_versions_period_idx on public.measurement_sheet_versions(organization_id, billing_period_id, version desc);
create index measurement_events_sheet_idx on public.measurement_sheet_events(measurement_sheet_id, created_at desc);
create index fiscal_batches_status_idx on public.fiscal_batches(organization_id, status, competence desc);

alter table public.measurement_sheet_versions enable row level security;
alter table public.measurement_sheet_events enable row level security;
alter table public.fiscal_batches enable row level security;

create policy "members read measurement versions" on public.measurement_sheet_versions for select to authenticated using (public.is_organization_member(organization_id));
create policy "finance managers manage measurement versions" on public.measurement_sheet_versions for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]));
create policy "members read measurement events" on public.measurement_sheet_events for select to authenticated using (public.is_organization_member(organization_id));
create policy "finance managers create measurement events" on public.measurement_sheet_events for insert to authenticated with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]));
create policy "members read fiscal batches" on public.fiscal_batches for select to authenticated using (public.is_organization_member(organization_id));
create policy "finance managers manage fiscal batches" on public.fiscal_batches for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]));
