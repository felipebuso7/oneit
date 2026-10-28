-- Garante que atribuições diretas à OS/chamado não cruzem organizações.
-- Os RPCs operacionais já fazem validações semelhantes; este trigger protege
-- também inserts/updates feitos por outros endpoints autorizados.
create or replace function public.validate_ticket_service_references()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  technician_organization_id uuid;
begin
  if new.assigned_technician_id is not null then
    select organization_id into technician_organization_id
      from public.technicians
     where id = new.assigned_technician_id;
    if technician_organization_id is null or technician_organization_id <> new.organization_id then
      raise exception 'TICKET_TECHNICIAN_ORGANIZATION_MISMATCH';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tickets_validate_technician_reference on public.tickets;
create trigger tickets_validate_technician_reference
before insert or update of organization_id, assigned_technician_id
on public.tickets
for each row execute function public.validate_ticket_service_references();

create or replace function public.validate_service_order_references()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  ticket_organization_id uuid;
  related_organization_id uuid;
begin
  select organization_id into ticket_organization_id from public.tickets where id = new.ticket_id;
  if ticket_organization_id is null or ticket_organization_id <> new.organization_id then
    raise exception 'SERVICE_ORDER_TICKET_ORGANIZATION_MISMATCH';
  end if;

  if new.technician_id is not null then
    select organization_id into related_organization_id from public.technicians where id = new.technician_id;
    if related_organization_id is null or related_organization_id <> new.organization_id then
      raise exception 'SERVICE_ORDER_TECHNICIAN_ORGANIZATION_MISMATCH';
    end if;
  end if;
  if new.location_id is not null then
    select organization_id into related_organization_id from public.customer_locations where id = new.location_id;
    if related_organization_id is null or related_organization_id <> new.organization_id then
      raise exception 'SERVICE_ORDER_LOCATION_ORGANIZATION_MISMATCH';
    end if;
  end if;
  if new.contract_id is not null then
    select organization_id into related_organization_id from public.contracts where id = new.contract_id;
    if related_organization_id is null or related_organization_id <> new.organization_id then
      raise exception 'SERVICE_ORDER_CONTRACT_ORGANIZATION_MISMATCH';
    end if;
  end if;
  if new.supplier_id is not null then
    select organization_id into related_organization_id from public.suppliers where id = new.supplier_id;
    if related_organization_id is null or related_organization_id <> new.organization_id then
      raise exception 'SERVICE_ORDER_SUPPLIER_ORGANIZATION_MISMATCH';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists service_orders_validate_references on public.service_orders;
create trigger service_orders_validate_references
before insert or update of organization_id, ticket_id, technician_id, location_id, contract_id, supplier_id
on public.service_orders
for each row execute function public.validate_service_order_references();
