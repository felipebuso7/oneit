-- Impede associar à fila uma submissão pertencente a outra OS.
create or replace function public.validate_field_service_review_org_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
declare order_org uuid; ticket_org uuid; submission_order uuid;
begin
  select organization_id into order_org from public.service_orders where id = new.service_order_id;
  select organization_id into ticket_org from public.tickets where id = new.ticket_id;
  if new.submission_id is not null then
    select pa.service_order_id into submission_order
      from public.service_order_partner_submissions ps
      join public.service_order_partner_accesses pa on pa.id = ps.partner_access_id
      where ps.id = new.submission_id;
  end if;
  if order_org is null or ticket_org is null or order_org <> new.organization_id or ticket_org <> new.organization_id
    or (new.submission_id is not null and submission_order is distinct from new.service_order_id) then
    raise exception 'FIELD_REVIEW_ORGANIZATION_MISMATCH';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_field_service_review_org_integrity() from public;
