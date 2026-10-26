create table public.service_level_policies (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  contract_id uuid not null references public.contracts(id) on delete restrict, priority smallint not null check (priority between 1 and 5),
  response_minutes integer not null check (response_minutes between 1 and 525600), resolution_minutes integer not null check (resolution_minutes between 1 and 525600), ola_minutes integer not null check (ola_minutes between 1 and 525600), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (contract_id, priority), check (response_minutes <= resolution_minutes)
);
create table public.ticket_service_levels (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null unique references public.tickets(id) on delete restrict, policy_id uuid not null references public.service_level_policies(id) on delete restrict,
  priority smallint not null check (priority between 1 and 5), response_minutes integer not null, resolution_minutes integer not null, ola_minutes integer not null,
  response_due_at timestamptz not null, resolution_due_at timestamptz not null, ola_due_at timestamptz not null, created_at timestamptz not null default now()
);
create index ticket_service_levels_resolution_due on public.ticket_service_levels(resolution_due_at);
alter table public.service_level_policies enable row level security; alter table public.ticket_service_levels enable row level security;
create policy "members read service level policies" on public.service_level_policies for select to authenticated using (public.is_organization_member(organization_id));
create policy "admins manage service level policies" on public.service_level_policies for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
create policy "management reads ticket service levels" on public.ticket_service_levels for select to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_id and public.has_ticket_management_role(t.organization_id)));
create or replace function public.snapshot_ticket_service_level() returns trigger language plpgsql security definer set search_path = public as $$
declare policy public.service_level_policies%rowtype;
begin
  if new.contract_id is null then return new; end if;
  select * into policy from public.service_level_policies where contract_id = new.contract_id and priority = new.priority and active limit 1;
  if policy.id is null then return new; end if;
  insert into public.ticket_service_levels(ticket_id, policy_id, priority, response_minutes, resolution_minutes, ola_minutes, response_due_at, resolution_due_at, ola_due_at)
  values (new.id, policy.id, new.priority, policy.response_minutes, policy.resolution_minutes, policy.ola_minutes, new.opened_at + make_interval(mins => policy.response_minutes), new.opened_at + make_interval(mins => policy.resolution_minutes), new.opened_at + make_interval(mins => policy.ola_minutes));
  return new;
end;
$$;
create trigger tickets_snapshot_service_level after insert on public.tickets for each row execute function public.snapshot_ticket_service_level();
create trigger service_level_policies_updated before update on public.service_level_policies for each row execute function public.set_updated_at();
