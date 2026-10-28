-- Cancelamento operacional seguro: remove o chamado da fila ativa sem apagar seu histórico.
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
     or ticket_row.operational_status in ('TRAVEL_STARTED','ON_SITE','WORK_STARTED','IN_PROGRESS','TECHNICALLY_COMPLETED') then
    raise exception 'TICKET_CANCEL_NOT_ALLOWED';
  end if;

  update public.tickets
     set operational_status = 'CANCELLED',
         updated_at = clock_timestamp()
   where id = ticket_row.id;

  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values (
    ticket_row.organization_id,
    auth.uid(),
    'TICKET_CANCELLED',
    'ticket',
    ticket_row.id,
    jsonb_build_object('reason', nullif(trim(target_reason), '')),
    'WEB'
  );
end;
$$;

revoke all on function public.cancel_ticket(uuid, integer, text) from public;
grant execute on function public.cancel_ticket(uuid, integer, text) to authenticated;
