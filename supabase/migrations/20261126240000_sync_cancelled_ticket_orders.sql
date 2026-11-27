-- Mantém a consistência operacional entre chamado e OS sem apagar histórico.
-- Chamados cancelados/encerrados não podem deixar OS abertas nas filas.
create or replace function public.sync_ticket_operational_closure()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.operational_status in ('CANCELLED', 'CLOSED')
     and old.operational_status is distinct from new.operational_status then
    update public.service_orders
       set status = 'CANCELLED', updated_at = clock_timestamp(), updated_by = auth.uid()
     where ticket_id = new.id
       and status not in ('COMPLETED', 'VALIDATED', 'CANCELLED');

    insert into public.service_order_events(service_order_id, organization_id, event_type, actor_id, metadata)
    select so.id, so.organization_id, 'CANCELLED', auth.uid(),
           jsonb_build_object('reason', 'CHAMADO_' || new.operational_status, 'source', 'ticket_status_sync')
      from public.service_orders so
     where so.ticket_id = new.id
       and so.status = 'CANCELLED'
       and not exists (
         select 1 from public.service_order_events e
          where e.service_order_id = so.id
            and e.event_type = 'CANCELLED'
            and e.metadata ->> 'source' = 'ticket_status_sync'
       );
  end if;
  return new;
end;
$$;

drop trigger if exists tickets_sync_service_orders on public.tickets;
create trigger tickets_sync_service_orders
after update of operational_status on public.tickets
for each row execute function public.sync_ticket_operational_closure();

create index if not exists service_orders_ticket_status_idx
  on public.service_orders(ticket_id, status);

