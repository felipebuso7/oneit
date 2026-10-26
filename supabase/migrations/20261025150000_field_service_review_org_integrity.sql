-- Garante que a fila de validação não cruze OS, chamado e organização.
create or replace function public.validate_field_service_review_org_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
declare order_org uuid; ticket_org uuid;
begin
  select organization_id into order_org from public.service_orders where id = new.service_order_id;
  select organization_id into ticket_org from public.tickets where id = new.ticket_id;
  if order_org is null or ticket_org is null or order_org <> new.organization_id or ticket_org <> new.organization_id then
    raise exception 'FIELD_REVIEW_ORGANIZATION_MISMATCH';
  end if;
  return new;
end;
$$;

drop trigger if exists field_service_review_org_integrity on public.field_service_review_queue;
create trigger field_service_review_org_integrity
  before insert or update of organization_id, service_order_id, ticket_id
  on public.field_service_review_queue
  for each row execute function public.validate_field_service_review_org_integrity();

revoke all on function public.validate_field_service_review_org_integrity() from public;
