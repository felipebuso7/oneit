-- Composições de LPU: agrupam itens vigentes em um serviço precificável.
-- Migration aditiva; não remove nem altera itens já cadastrados.

create table if not exists public.field_service_lpu_compositions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  description text not null,
  active boolean not null default true,
  valid_from date not null default current_date,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  check (length(trim(code)) >= 2),
  check (length(trim(description)) >= 2),
  check (valid_until is null or valid_until >= valid_from)
);

create table if not exists public.field_service_lpu_composition_lines (
  id uuid primary key default gen_random_uuid(),
  composition_id uuid not null references public.field_service_lpu_compositions(id) on delete cascade,
  lpu_item_id uuid not null references public.field_service_lpu_items(id) on delete restrict,
  quantity numeric(12,3) not null check (quantity > 0 and quantity <= 100000),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  unique (composition_id, lpu_item_id)
);

create index if not exists field_service_lpu_compositions_active_idx
  on public.field_service_lpu_compositions (organization_id, active, code);
create index if not exists field_service_lpu_composition_lines_composition_idx
  on public.field_service_lpu_composition_lines (composition_id);

create or replace function public.field_service_lpu_compositions_updated()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists field_service_lpu_compositions_updated on public.field_service_lpu_compositions;
create trigger field_service_lpu_compositions_updated
before update on public.field_service_lpu_compositions
for each row execute function public.field_service_lpu_compositions_updated();

alter table public.field_service_lpu_compositions enable row level security;
alter table public.field_service_lpu_composition_lines enable row level security;

drop policy if exists "members read field service lpu compositions" on public.field_service_lpu_compositions;
create policy "members read field service lpu compositions"
on public.field_service_lpu_compositions for select to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "admins manage field service lpu compositions" on public.field_service_lpu_compositions;
create policy "admins manage field service lpu compositions"
on public.field_service_lpu_compositions for all to authenticated
using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]))
with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));

drop policy if exists "members read field service lpu composition lines" on public.field_service_lpu_composition_lines;
create policy "members read field service lpu composition lines"
on public.field_service_lpu_composition_lines for select to authenticated
using (exists (
  select 1 from public.field_service_lpu_compositions c
  where c.id = composition_id and public.is_organization_member(c.organization_id)
));

drop policy if exists "admins manage field service lpu composition lines" on public.field_service_lpu_composition_lines;
create policy "admins manage field service lpu composition lines"
on public.field_service_lpu_composition_lines for all to authenticated
using (exists (
  select 1 from public.field_service_lpu_compositions c
  where c.id = composition_id and public.has_organization_role(c.organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])
))
with check (exists (
  select 1 from public.field_service_lpu_compositions c
  where c.id = composition_id and public.has_organization_role(c.organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])
));
