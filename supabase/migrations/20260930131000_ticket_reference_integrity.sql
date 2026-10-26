create or replace function public.validate_ticket_reference_organizations()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.customers where id = new.customer_id and organization_id = new.organization_id) then
    raise exception 'Ticket customer must belong to the ticket organization.';
  end if;
  if new.contract_id is not null and not exists (select 1 from public.contracts where id = new.contract_id and organization_id = new.organization_id and customer_id = new.customer_id) then
    raise exception 'Ticket contract must belong to the selected customer and organization.';
  end if;
  if not exists (select 1 from public.customer_locations where id = new.location_id and organization_id = new.organization_id and customer_id = new.customer_id) then
    raise exception 'Ticket location must belong to the selected customer and organization.';
  end if;
  return new;
end;
$$;
create trigger tickets_validate_references before insert or update of organization_id, customer_id, contract_id, location_id on public.tickets for each row execute function public.validate_ticket_reference_organizations();
