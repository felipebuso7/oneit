-- Keep the existing complete_ticket(uuid, integer, boolean, text) RPC and its
-- authorization, checklist, evidence and audit rules intact. Synchronize the
-- optional field OS when that RPC inserts a technical completion.
create or replace function public.sync_service_order_on_ticket_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  order_record public.service_orders%rowtype;
  checkout_time timestamptz := new.created_at;
begin
  select * into order_record
    from public.service_orders
   where ticket_id = new.ticket_id
   for update;

  if order_record.id is null then
    return new;
  end if;

  if order_record.technician_id is distinct from new.technician_id
     or order_record.status not in ('CHECKED_IN', 'IN_SERVICE') then
    raise exception 'SERVICE_ORDER_NOT_READY_FOR_COMPLETION';
  end if;

  update public.service_orders
     set status = 'COMPLETED',
         checked_out_at = checkout_time,
         completed_at = checkout_time,
         updated_by = auth.uid()
   where id = order_record.id;

  update public.field_service_route_stops
     set checked_out_at = checkout_time
   where service_order_id = order_record.id
     and checked_out_at is null;

  insert into public.service_order_events
    (service_order_id, organization_id, event_type, occurred_at, actor_id, details)
  values
    (order_record.id, order_record.organization_id, 'CHECK_OUT', checkout_time,
     auth.uid(), jsonb_build_object('source', 'ticket_completion', 'completion_id', new.id)),
    (order_record.id, order_record.organization_id, 'COMPLETED', checkout_time,
     auth.uid(), jsonb_build_object('source', 'ticket_completion', 'completion_id', new.id));

  return new;
end;
$$;

create trigger ticket_completion_service_order_sync
  after insert on public.ticket_completions
  for each row execute function public.sync_service_order_on_ticket_completion();
