-- Chamados encerrados podem ser retirados da fila somente pelo Administrador Master.
-- A operação continua sendo uma anulação auditada; não remove histórico financeiro
-- automaticamente, pois BMs/RTOs podem estar referenciados por versões fiscais.
create or replace function public.cancel_ticket(
  target_ticket_id uuid,
  expected_version integer,
  target_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ticket_row public.tickets%rowtype;
begin
  select * into ticket_row
    from public.tickets
   where id = target_ticket_id
   for update;

  if ticket_row.id is null or not public.has_ticket_management_role(ticket_row.organization_id) then
    raise exception 'TICKET_NOT_AUTHORIZED';
  end if;
  if ticket_row.version <> expected_version then
    raise exception 'TICKET_VERSION_CONFLICT';
  end if;
  if ticket_row.administrative_status = 'CLOSED'
     and not public.has_organization_role(ticket_row.organization_id, array['SUPER_ADMIN']::public.platform_role[]) then
    raise exception 'TICKET_CLOSED_MASTER_ONLY';
  end if;

  update public.tickets
     set operational_status = 'CANCELLED', version = version + 1, updated_at = clock_timestamp()
   where id = ticket_row.id;

  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values (
    ticket_row.organization_id,
    auth.uid(),
    'TICKET_CANCELLED',
    'ticket',
    ticket_row.id,
    jsonb_build_object('reason', nullif(trim(target_reason), ''), 'closed_override', ticket_row.administrative_status = 'CLOSED', 'derived_documents_preserved', true),
    'WEB'
  );
end;
$$;

revoke all on function public.cancel_ticket(uuid, integer, text) from public;
grant execute on function public.cancel_ticket(uuid, integer, text) to authenticated;
