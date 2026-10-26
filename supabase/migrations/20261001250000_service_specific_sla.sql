alter table public.service_level_policies
  add column service_offering_id uuid references public.service_offerings(id) on delete restrict;

alter table public.service_level_policies
  drop constraint service_level_policies_contract_id_priority_key;

create unique index service_level_default_policy_unique
  on public.service_level_policies (contract_id, priority)
  where service_offering_id is null;

create unique index service_level_service_policy_unique
  on public.service_level_policies (contract_id, priority, service_offering_id)
  where service_offering_id is not null;

create or replace function public.validate_service_level_policy_offering()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare offering_organization_id uuid;
begin
  if new.service_offering_id is null then return new; end if;

  select category.organization_id into offering_organization_id
  from public.service_offerings offering
  join public.service_subcategories subcategory on subcategory.id = offering.subcategory_id
  join public.service_categories category on category.id = subcategory.category_id
  where offering.id = new.service_offering_id and offering.active and subcategory.active and category.active;

  if offering_organization_id is null or offering_organization_id <> new.organization_id then
    raise exception 'SERVICE_LEVEL_OFFERING_INVALID';
  end if;
  return new;
end;
$$;

create trigger service_level_policy_validate_offering
before insert or update of organization_id, service_offering_id on public.service_level_policies
for each row execute function public.validate_service_level_policy_offering();

create or replace function public.snapshot_ticket_service_level()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare policy public.service_level_policies%rowtype;
begin
  if new.contract_id is null then return new; end if;

  select * into policy
  from public.service_level_policies
  where contract_id = new.contract_id
    and priority = new.priority
    and active
    and (service_offering_id is null or service_offering_id = new.service_offering_id)
  order by (service_offering_id is not null) desc
  limit 1;

  if policy.id is null then return new; end if;
  insert into public.ticket_service_levels(ticket_id, policy_id, priority, response_minutes, resolution_minutes, ola_minutes, response_due_at, resolution_due_at, ola_due_at)
  values (new.id, policy.id, new.priority, policy.response_minutes, policy.resolution_minutes, policy.ola_minutes, new.opened_at + make_interval(mins => policy.response_minutes), new.opened_at + make_interval(mins => policy.resolution_minutes), new.opened_at + make_interval(mins => policy.ola_minutes));
  return new;
end;
$$;
