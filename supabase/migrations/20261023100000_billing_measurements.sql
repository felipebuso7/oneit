-- Ciclo financeiro do Field Service: medição, contestação e envio fiscal.
create type public.measurement_status as enum (
  'DRAFT', 'READY_FOR_REVIEW', 'SENT_FOR_CONTESTATION', 'CONTESTED',
  'APPROVED', 'SENT_TO_TAX', 'CLOSED'
);

create table public.billing_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  competence date not null,
  status public.measurement_status not null default 'DRAFT',
  contestation_deadline timestamptz,
  closed_at timestamptz,
  closed_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (date_trunc('month', competence)::date = competence),
  check ((status in ('SENT_FOR_CONTESTATION', 'CONTESTED', 'APPROVED', 'SENT_TO_TAX', 'CLOSED')) = (contestation_deadline is not null)),
  check ((status = 'CLOSED') = (closed_at is not null and closed_by is not null)),
  unique (organization_id, competence)
);

create table public.measurement_sheets (
  id uuid primary key default gen_random_uuid(),
  billing_period_id uuid not null unique references public.billing_periods(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  sheet_number text not null,
  total_orders integer not null default 0 check (total_orders >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  report_id uuid references public.ticket_reports(id) on delete restrict,
  sent_to_customer_at timestamptz,
  sent_to_customer_by uuid references public.user_profiles(id) on delete set null,
  approved_at timestamptz,
  approved_by uuid references public.user_profiles(id) on delete set null,
  sent_to_tax_at timestamptz,
  sent_to_tax_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sheet_number)
);

create table public.measurement_sheet_lines (
  id uuid primary key default gen_random_uuid(),
  measurement_sheet_id uuid not null references public.measurement_sheets(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  ticket_number text not null,
  lpu_code text,
  description text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  total_price numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (measurement_sheet_id, ticket_id, lpu_code, description)
);

-- Visão macro do BM: consolidação por serviço/LPU dentro da competência.
create table public.measurement_sheet_summary (
  id uuid primary key default gen_random_uuid(),
  measurement_sheet_id uuid not null references public.measurement_sheets(id) on delete cascade,
  lpu_code text,
  description text not null,
  order_count integer not null default 0 check (order_count >= 0),
  total_quantity numeric(12,3) not null default 0 check (total_quantity >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  created_at timestamptz not null default now(),
  unique (measurement_sheet_id, lpu_code, description)
);

create table public.measurement_contestations (
  id uuid primary key default gen_random_uuid(),
  billing_period_id uuid not null references public.billing_periods(id) on delete restrict,
  measurement_sheet_id uuid not null references public.measurement_sheets(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  opened_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  resolved_at timestamptz,
  resolved_by uuid references public.user_profiles(id) on delete set null,
  resolution text,
  status text not null default 'OPEN' check (status in ('OPEN', 'ACCEPTED', 'REJECTED', 'RESOLVED')),
  check (resolved_at is null or resolved_by is not null),
  check (status = 'OPEN' or resolved_at is not null),
  unique (measurement_sheet_id)
);

create index billing_periods_status_idx on public.billing_periods(organization_id, status, competence desc);
create index measurement_lines_ticket_idx on public.measurement_sheet_lines(ticket_id);
create index measurement_summary_sheet_idx on public.measurement_sheet_summary(measurement_sheet_id);
create index contestations_deadline_idx on public.measurement_contestations(status, deadline_at);

alter table public.billing_periods enable row level security;
alter table public.measurement_sheets enable row level security;
alter table public.measurement_sheet_lines enable row level security;
alter table public.measurement_sheet_summary enable row level security;
alter table public.measurement_contestations enable row level security;

create policy "members read billing periods" on public.billing_periods for select to authenticated using (public.is_organization_member(organization_id));
create policy "finance managers manage billing periods" on public.billing_periods for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]));
create policy "members read measurement sheets" on public.measurement_sheets for select to authenticated using (public.is_organization_member(organization_id));
create policy "finance managers manage measurement sheets" on public.measurement_sheets for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]));
create policy "members read measurement lines" on public.measurement_sheet_lines for select to authenticated using (exists (select 1 from public.measurement_sheets s where s.id = measurement_sheet_id and public.is_organization_member(s.organization_id)));
create policy "finance managers manage measurement lines" on public.measurement_sheet_lines for all to authenticated using (exists (select 1 from public.measurement_sheets s where s.id = measurement_sheet_id and public.has_organization_role(s.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]))) with check (exists (select 1 from public.measurement_sheets s where s.id = measurement_sheet_id and public.has_organization_role(s.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[])));
create policy "members read measurement summary" on public.measurement_sheet_summary for select to authenticated using (exists (select 1 from public.measurement_sheets s where s.id = measurement_sheet_id and public.is_organization_member(s.organization_id)));
create policy "finance managers manage measurement summary" on public.measurement_sheet_summary for all to authenticated using (exists (select 1 from public.measurement_sheets s where s.id = measurement_sheet_id and public.has_organization_role(s.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]))) with check (exists (select 1 from public.measurement_sheets s where s.id = measurement_sheet_id and public.has_organization_role(s.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[])));
create policy "members read contestations" on public.measurement_contestations for select to authenticated using (public.is_organization_member(organization_id));
create policy "finance managers manage contestations" on public.measurement_contestations for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]));

create trigger billing_periods_updated before update on public.billing_periods for each row execute function public.set_updated_at();
create trigger measurement_sheets_updated before update on public.measurement_sheets for each row execute function public.set_updated_at();
