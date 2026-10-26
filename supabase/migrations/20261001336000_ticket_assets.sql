create type public.ticket_asset_relationship as enum ('AFFECTED','RELATED','REPLACEMENT');

create table public.ticket_assets (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  asset_id uuid not null references public.assets(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  relationship_type public.ticket_asset_relationship not null default 'AFFECTED',
  notes text check(notes is null or length(trim(notes)) <= 2000),
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete set null,
  unique(ticket_id, asset_id)
);

create index ticket_assets_ticket_idx on public.ticket_assets(ticket_id);
create index ticket_assets_asset_idx on public.ticket_assets(asset_id);

create or replace function public.validate_ticket_asset_organization()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.tickets where id = new.ticket_id and organization_id = new.organization_id) then
    raise exception 'TICKET_ASSET_TICKET_ORGANIZATION_MISMATCH';
  end if;
  if not exists (select 1 from public.assets where id = new.asset_id and organization_id = new.organization_id) then
    raise exception 'TICKET_ASSET_ASSET_ORGANIZATION_MISMATCH';
  end if;
  return new;
end;
$$;

create trigger ticket_assets_validate_organization
before insert or update of ticket_id, asset_id, organization_id on public.ticket_assets
for each row execute function public.validate_ticket_asset_organization();

alter table public.ticket_assets enable row level security;
create policy "management reads ticket assets" on public.ticket_assets for select to authenticated using (public.has_ticket_management_role(organization_id));
create policy "management manages ticket assets" on public.ticket_assets for all to authenticated using (public.has_ticket_management_role(organization_id)) with check (public.has_ticket_management_role(organization_id));
