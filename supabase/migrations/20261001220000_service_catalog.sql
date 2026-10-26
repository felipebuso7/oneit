create table public.service_categories (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,79}$'), name text not null check (length(trim(name)) between 2 and 200), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (organization_id, code)
);
create table public.service_subcategories (
  id uuid primary key default gen_random_uuid(), category_id uuid not null references public.service_categories(id) on delete restrict,
  code text not null check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,79}$'), name text not null check (length(trim(name)) between 2 and 200), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (category_id, code)
);
create table public.service_offerings (
  id uuid primary key default gen_random_uuid(), subcategory_id uuid not null references public.service_subcategories(id) on delete restrict,
  code text not null check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,79}$'), name text not null check (length(trim(name)) between 2 and 200), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (subcategory_id, code)
);
alter table public.tickets add column service_offering_id uuid references public.service_offerings(id) on delete restrict;
create index tickets_service_offering_opened on public.tickets(service_offering_id, opened_at desc);
alter table public.service_categories enable row level security; alter table public.service_subcategories enable row level security; alter table public.service_offerings enable row level security;
create policy "members read service categories" on public.service_categories for select to authenticated using (public.is_organization_member(organization_id));
create policy "admins manage service categories" on public.service_categories for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
create policy "members read service subcategories" on public.service_subcategories for select to authenticated using (exists (select 1 from public.service_categories c where c.id = category_id and public.is_organization_member(c.organization_id)));
create policy "admins manage service subcategories" on public.service_subcategories for all to authenticated using (exists (select 1 from public.service_categories c where c.id = category_id and public.has_organization_role(c.organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]))) with check (exists (select 1 from public.service_categories c where c.id = category_id and public.has_organization_role(c.organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])));
create policy "members read service offerings" on public.service_offerings for select to authenticated using (exists (select 1 from public.service_subcategories s join public.service_categories c on c.id = s.category_id where s.id = subcategory_id and public.is_organization_member(c.organization_id)));
create policy "admins manage service offerings" on public.service_offerings for all to authenticated using (exists (select 1 from public.service_subcategories s join public.service_categories c on c.id = s.category_id where s.id = subcategory_id and public.has_organization_role(c.organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]))) with check (exists (select 1 from public.service_subcategories s join public.service_categories c on c.id = s.category_id where s.id = subcategory_id and public.has_organization_role(c.organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])));
create trigger service_categories_updated before update on public.service_categories for each row execute function public.set_updated_at();
create trigger service_subcategories_updated before update on public.service_subcategories for each row execute function public.set_updated_at();
create trigger service_offerings_updated before update on public.service_offerings for each row execute function public.set_updated_at();
create or replace function public.validate_ticket_service_offering() returns trigger language plpgsql security definer set search_path = public as $$
declare offering public.service_offerings%rowtype; subcategory public.service_subcategories%rowtype; category public.service_categories%rowtype;
begin
  if new.service_offering_id is null then return new; end if;
  select * into offering from public.service_offerings where id = new.service_offering_id and active;
  select * into subcategory from public.service_subcategories where id = offering.subcategory_id and active;
  select * into category from public.service_categories where id = subcategory.category_id and active;
  if offering.id is null or subcategory.id is null or category.id is null or category.organization_id <> new.organization_id then raise exception 'TICKET_SERVICE_OFFERING_INVALID'; end if;
  new.category_code := category.code; new.service_type_code := offering.code; return new;
end;
$$;
create trigger tickets_validate_service_offering before insert or update of organization_id, service_offering_id on public.tickets for each row execute function public.validate_ticket_service_offering();
