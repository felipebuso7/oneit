-- A aprovação gerencial só pode tornar a OS VALIDATED após checkout e aprovação
-- explícita na fila. Protege caminhos de escrita além da RPC principal.
create or replace function public.validate_service_order_validation_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'VALIDATED' then
    if new.checked_out_at is null then
      raise exception 'SERVICE_ORDER_VALIDATION_CHECKOUT_REQUIRED';
    end if;
    if not exists (
      select 1 from public.field_service_review_queue queue
       where queue.service_order_id = new.id
         and queue.organization_id = new.organization_id
         and queue.ticket_id = new.ticket_id
         and queue.status = 'APPROVED'
    ) then
      raise exception 'SERVICE_ORDER_VALIDATION_REVIEW_REQUIRED';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists service_orders_validate_validation_state on public.service_orders;
create trigger service_orders_validate_validation_state
before insert or update of status, checked_out_at, organization_id, ticket_id
on public.service_orders
for each row execute function public.validate_service_order_validation_state();
