-- Cadastros persistentes da operação de campo.
-- A aplicação ainda mantém o modo demonstrativo local; esta migration prepara a fonte oficial.

create table if not exists public.field_service_technicians (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text not null,
  technician_type text not null default 'internal' check (technician_type in ('internal', 'partner')),
  phone text,
  mobile text,
  job_title text,
  hourly_cost numeric(12,2) check (hourly_cost is null or hourly_cost >= 0),
  base_address text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email),
  check (length(trim(name)) >= 2),
  check (position('@' in email) > 1)
);

create index if not exists field_service_technicians_active_idx on public.field_service_technicians (organization_id, active, name);
create trigger field_service_technicians_updated before update on public.field_service_technicians for each row execute function public.set_updated_at();
alter table public.field_service_technicians enable row level security;
create policy "members read field service technicians" on public.field_service_technicians for select to authenticated using (public.is_organization_member(organization_id));
create policy "admins manage field service technicians" on public.field_service_technicians for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));

create table if not exists public.field_service_companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  legal_name text not null,
  trade_name text,
  cnpj text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, legal_name),
  unique (organization_id, cnpj)
);

create table if not exists public.field_service_polos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.field_service_companies(id) on delete restrict,
  name text not null,
  address text not null,
  city text not null,
  state text not null default 'SP',
  region text not null,
  distance_capital_km numeric(10,2) not null default 0 check (distance_capital_km >= 0),
  latitude numeric(9,6),
  longitude numeric(9,6),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name),
  check (length(trim(name)) > 0),
  check (length(trim(city)) > 0)
);

create table if not exists public.field_service_lpu_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  description text not null,
  kind text not null default 'material' check (kind in ('material', 'mao_de_obra', 'deslocamento')),
  unit text not null check (unit in ('unidade', 'peça', 'metro', 'centímetro', 'hora', 'visita', 'quilômetro')),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  active boolean not null default true,
  valid_from date not null default current_date,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  check (valid_until is null or valid_until >= valid_from),
  check (length(trim(description)) > 0)
);

create index if not exists field_service_polos_company_idx on public.field_service_polos (company_id, active);
create index if not exists field_service_lpu_active_idx on public.field_service_lpu_items (organization_id, active, code);

create trigger field_service_companies_updated before update on public.field_service_companies for each row execute function public.set_updated_at();
create trigger field_service_polos_updated before update on public.field_service_polos for each row execute function public.set_updated_at();
create trigger field_service_lpu_updated before update on public.field_service_lpu_items for each row execute function public.set_updated_at();

alter table public.field_service_companies enable row level security;
alter table public.field_service_polos enable row level security;
alter table public.field_service_lpu_items enable row level security;

create policy "members read field service companies" on public.field_service_companies for select to authenticated using (public.is_organization_member(organization_id));
create policy "admins manage field service companies" on public.field_service_companies for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
create policy "members read field service polos" on public.field_service_polos for select to authenticated using (public.is_organization_member(organization_id));
create policy "admins manage field service polos" on public.field_service_polos for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
create policy "members read field service lpu" on public.field_service_lpu_items for select to authenticated using (public.is_organization_member(organization_id));
create policy "admins manage field service lpu" on public.field_service_lpu_items for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
