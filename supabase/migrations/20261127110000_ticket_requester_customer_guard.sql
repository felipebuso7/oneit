-- Tarefa 03: o solicitante ativo deve pertencer ao mesmo cliente do chamado.
create or replace function public.validate_ticket_intake_links()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.requester_collaborator_id is not null and not exists (
    select 1 from public.collaborators c
    where c.id = new.requester_collaborator_id
      and c.organization_id = new.organization_id
      and c.customer_id = new.customer_id
      and c.status = 'ACTIVE'
  ) then
    raise exception 'TICKET_REQUESTER_INVALID';
  end if;
  if new.department_unit_id is not null and not exists (
    select 1 from public.organization_units u
    where u.id = new.department_unit_id and u.organization_id = new.organization_id
      and u.customer_id = new.customer_id and u.unit_type = 'DEPARTMENT' and u.active
  ) then
    raise exception 'TICKET_DEPARTMENT_INVALID';
  end if;
  return new;
end; $$;

drop trigger if exists tickets_validate_intake_links on public.tickets;
create trigger tickets_validate_intake_links
before insert or update of organization_id,customer_id,requester_collaborator_id,department_unit_id
on public.tickets for each row execute function public.validate_ticket_intake_links();
