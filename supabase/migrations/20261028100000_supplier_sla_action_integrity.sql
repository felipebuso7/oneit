-- Impede que uma ação de tratamento associe SLA ou fornecedor de outra organização.
-- A regra fica no banco para proteger também chamadas diretas à API.
create or replace function public.validate_supplier_sla_action_links()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  sla_organization_id uuid;
  supplier_organization_id uuid;
begin
  select organization_id into sla_organization_id
    from public.supplier_sla_records
   where id = new.sla_record_id;
  if sla_organization_id is null or sla_organization_id <> new.organization_id then
    raise exception 'SUPPLIER_SLA_ACTION_SLA_ORGANIZATION_MISMATCH';
  end if;

  select organization_id into supplier_organization_id
    from public.suppliers
   where id = new.supplier_id;
  if supplier_organization_id is null or supplier_organization_id <> new.organization_id then
    raise exception 'SUPPLIER_SLA_ACTION_SUPPLIER_ORGANIZATION_MISMATCH';
  end if;

  if new.owner_id is not null and not exists (
    select 1 from public.user_roles role
     where role.user_id = new.owner_id
       and role.organization_id = new.organization_id
  ) then
    raise exception 'SUPPLIER_SLA_ACTION_OWNER_ORGANIZATION_MISMATCH';
  end if;

  return new;
end;
$$;

drop trigger if exists supplier_sla_actions_validate_links on public.supplier_sla_actions;
create trigger supplier_sla_actions_validate_links
before insert or update of organization_id, sla_record_id, supplier_id, owner_id
on public.supplier_sla_actions
for each row execute function public.validate_supplier_sla_action_links();
