-- Execute somente pelo fluxo versionado de migrations do Supabase.
create extension if not exists pgcrypto;

create type public.platform_role as enum ('SUPER_ADMIN','ORG_ADMIN','DISPATCHER','MANAGER','TECHNICIAN','AUDITOR','FINANCE');
create type public.technician_status as enum ('AVAILABLE','BUSY','OFFLINE','UNAVAILABLE','VACATION');

create table public.organizations (
  id uuid primary key default gen_random_uuid(), legal_name text not null, display_name text not null,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade, full_name text not null, email text not null,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.user_profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade, role public.platform_role not null,
  created_at timestamptz not null default now(), unique (user_id, organization_id, role)
);
create table public.customers (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null, external_code text, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (organization_id, external_code)
);
create table public.contracts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict, code text not null, name text not null,
  starts_at date not null, ends_at date, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (organization_id, code)
);
create table public.regions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null, state_code char(2), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (organization_id, name)
);
create table public.technicians (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid unique references public.user_profiles(id) on delete set null, full_name text not null, email text, phone text,
  employment_type text not null, base_city text, primary_region_id uuid references public.regions(id) on delete set null,
  status public.technician_status not null default 'UNAVAILABLE', active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.customer_locations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict, external_code text, name text not null,
  street text, street_number text, complement text, district text, city text not null, state_code char(2), postal_code text,
  latitude numeric(9,6), longitude numeric(9,6), region_id uuid references public.regions(id) on delete set null,
  requires_appointment boolean not null default false, requires_induction boolean not null default false,
  requires_ppe boolean not null default false, requires_escort boolean not null default false, access_instructions text,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, customer_id, external_code)
);
create table public.location_contacts (
  id uuid primary key default gen_random_uuid(), location_id uuid not null references public.customer_locations(id) on delete cascade,
  name text not null, role text, phone text, mobile text, email text, contact_type text not null, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  actor_id uuid references public.user_profiles(id) on delete set null, action text not null, entity_type text not null, entity_id uuid,
  before_value jsonb, after_value jsonb, source text not null default 'WEB', correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create index customers_organization_idx on public.customers (organization_id);
create index contracts_customer_idx on public.contracts (customer_id);
create index technicians_organization_idx on public.technicians (organization_id);
create index locations_customer_idx on public.customer_locations (customer_id);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
create or replace function public.is_organization_member(target_organization_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.user_roles where user_id = auth.uid() and organization_id = target_organization_id); $$;
create or replace function public.has_organization_role(target_organization_id uuid, allowed_roles public.platform_role[]) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.user_roles where user_id = auth.uid() and organization_id = target_organization_id and role = any(allowed_roles)); $$;
revoke all on function public.is_organization_member(uuid), public.has_organization_role(uuid, public.platform_role[]) from public;
grant execute on function public.is_organization_member(uuid), public.has_organization_role(uuid, public.platform_role[]) to authenticated;

create trigger organizations_updated before update on public.organizations for each row execute function public.set_updated_at();
create trigger profiles_updated before update on public.user_profiles for each row execute function public.set_updated_at();
create trigger customers_updated before update on public.customers for each row execute function public.set_updated_at();
create trigger contracts_updated before update on public.contracts for each row execute function public.set_updated_at();
create trigger regions_updated before update on public.regions for each row execute function public.set_updated_at();
create trigger technicians_updated before update on public.technicians for each row execute function public.set_updated_at();
create trigger locations_updated before update on public.customer_locations for each row execute function public.set_updated_at();
create trigger contacts_updated before update on public.location_contacts for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.customers enable row level security;
alter table public.contracts enable row level security;
alter table public.regions enable row level security;
alter table public.technicians enable row level security;
alter table public.customer_locations enable row level security;
alter table public.location_contacts enable row level security;
alter table public.audit_logs enable row level security;

create policy "members read organizations" on public.organizations for select to authenticated using (public.is_organization_member(id));
create policy "admins update organizations" on public.organizations for update to authenticated using (public.has_organization_role(id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
create policy "users read own profile" on public.user_profiles for select to authenticated using (id = auth.uid());
create policy "users update own profile" on public.user_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "members read roles" on public.user_roles for select to authenticated using (public.is_organization_member(organization_id));

create policy "members read customers" on public.customers for select to authenticated using (public.is_organization_member(organization_id));
create policy "admins manage customers" on public.customers for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
create policy "members read contracts" on public.contracts for select to authenticated using (public.is_organization_member(organization_id));
create policy "admins manage contracts" on public.contracts for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
create policy "members read regions" on public.regions for select to authenticated using (public.is_organization_member(organization_id));
create policy "admins manage regions" on public.regions for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
create policy "members read technicians" on public.technicians for select to authenticated using (public.is_organization_member(organization_id));
create policy "admins manage technicians" on public.technicians for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
create policy "members read locations" on public.customer_locations for select to authenticated using (public.is_organization_member(organization_id));
create policy "admins manage locations" on public.customer_locations for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
create policy "members read contacts" on public.location_contacts for select to authenticated using (exists (select 1 from public.customer_locations l where l.id = location_id and public.is_organization_member(l.organization_id)));
create policy "admins manage contacts" on public.location_contacts for all to authenticated using (exists (select 1 from public.customer_locations l where l.id = location_id and public.has_organization_role(l.organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]))) with check (exists (select 1 from public.customer_locations l where l.id = location_id and public.has_organization_role(l.organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])));
create policy "authorized read audit" on public.audit_logs for select to authenticated using (organization_id is not null and public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','AUDITOR']::public.platform_role[]));
