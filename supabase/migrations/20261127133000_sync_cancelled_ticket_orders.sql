-- Single source of truth: a cancelled/closed operational ticket cannot keep
-- an active service order that would reappear in scheduling or routes.
create or replace function public.sync_cancelled_ticket_service_orders()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.operational_status = 'CANCELLED' and old.operational_status is distinct from new.operational_status then
    update public.service_orders
       set status = 'CANCELLED', updated_at = clock_timestamp(), updated_by = auth.uid()
     where ticket_id = new.id and status <> 'CANCELLED';
  end if;
  return new;
end; $$;

drop trigger if exists tickets_sync_cancelled_service_orders on public.tickets;
create trigger tickets_sync_cancelled_service_orders
after update of operational_status on public.tickets
for each row execute function public.sync_cancelled_ticket_service_orders();
