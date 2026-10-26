create table public.organization_unit_addresses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  unit_id uuid not null unique references public.organization_units(id) on delete restrict,
  address_line text not null,
  city text not null,
  state_code char(2),
  postal_code text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  local_contact_name text,
  local_contact_phone text,
  access_notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.field_service_teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete set null,
  name text not null,
  team_kind text not null check(team_kind in ('INTERNAL','PARTNER')),
  coordinator_name text,
  coordinator_phone text,
  coordinator_email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,name)
);

create table public.field_service_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.field_service_teams(id) on delete cascade,
  technician_id uuid not null references public.technicians(id) on delete restrict,
  partner_ticket_reference text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(team_id,technician_id)
);

alter table public.service_orders
  add column requester_contact_name text,
  add column requester_contact_phone text,
  add column local_contact_name text,
  add column local_contact_phone text,
  add column technician_notes text,
  add column external_order_reference text,
  add column lpu_code text,
  add column quoted_amount numeric(14,2);

create trigger organization_unit_addresses_updated before update on public.organization_unit_addresses for each row execute function public.set_updated_at();
create trigger field_service_teams_updated before update on public.field_service_teams for each row execute function public.set_updated_at();

alter table public.organization_unit_addresses enable row level security;
alter table public.field_service_teams enable row level security;
alter table public.field_service_team_members enable row level security;

create policy "members read unit addresses" on public.organization_unit_addresses for select to authenticated using(public.is_organization_member(organization_id));
create policy "admins manage unit addresses" on public.organization_unit_addresses for all to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])) with check(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
create policy "members read field teams" on public.field_service_teams for select to authenticated using(public.is_organization_member(organization_id));
create policy "dispatchers manage field teams" on public.field_service_teams for all to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[])) with check(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]));
create policy "members read field team members" on public.field_service_team_members for select to authenticated using(exists(select 1 from public.field_service_teams t where t.id=team_id and public.is_organization_member(t.organization_id)));
create policy "dispatchers manage field team members" on public.field_service_team_members for all to authenticated using(exists(select 1 from public.field_service_teams t where t.id=team_id and public.has_organization_role(t.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]))) with check(exists(select 1 from public.field_service_teams t where t.id=team_id and public.has_organization_role(t.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[])));

