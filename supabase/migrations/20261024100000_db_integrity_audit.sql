-- Auditoria DBA: reforça isolamento por organização nas relações que antes
-- dependiam apenas da aplicação para manter os vínculos consistentes.
create or replace function public.assert_field_service_organization_integrity()
returns trigger language plpgsql security definer set search_path=public as $$
declare parent_org uuid;
begin
  if tg_table_name = 'field_service_polos' then
    select organization_id into parent_org from public.field_service_companies where id = new.company_id;
    if parent_org is null or parent_org <> new.organization_id then raise exception 'FIELD_SERVICE_CROSS_ORGANIZATION_REFERENCE'; end if;
  elsif tg_table_name = 'field_service_route_stops' then
    select organization_id into parent_org from public.field_service_routes where id = new.route_id;
    if parent_org is null or parent_org <> new.organization_id then raise exception 'FIELD_ROUTE_ORGANIZATION_MISMATCH'; end if;
    select organization_id into parent_org from public.service_orders where id = new.service_order_id;
    if parent_org is null or parent_org <> new.organization_id then raise exception 'FIELD_STOP_ORDER_ORGANIZATION_MISMATCH'; end if;
  elsif tg_table_name = 'service_order_partner_accesses' then
    select organization_id into parent_org from public.service_orders where id = new.service_order_id;
    if parent_org is null or parent_org <> new.organization_id then raise exception 'PARTNER_ACCESS_ORDER_ORGANIZATION_MISMATCH'; end if;
    if new.supplier_id is not null then
      select organization_id into parent_org from public.suppliers where id = new.supplier_id;
      if parent_org is null or parent_org <> new.organization_id then raise exception 'PARTNER_ACCESS_SUPPLIER_ORGANIZATION_MISMATCH'; end if;
    end if;
  elsif tg_table_name = 'service_order_partner_submissions' then
    select organization_id into parent_org from public.service_order_partner_accesses where id = new.partner_access_id;
    if parent_org is null or parent_org <> new.organization_id then raise exception 'PARTNER_SUBMISSION_ORGANIZATION_MISMATCH'; end if;
  end if;
  return new;
end; $$;

drop trigger if exists field_service_polo_org_integrity on public.field_service_polos;
create trigger field_service_polo_org_integrity before insert or update on public.field_service_polos for each row execute function public.assert_field_service_organization_integrity();
drop trigger if exists field_service_route_stop_org_integrity on public.field_service_route_stops;
create trigger field_service_route_stop_org_integrity before insert or update on public.field_service_route_stops for each row execute function public.assert_field_service_organization_integrity();
drop trigger if exists partner_access_org_integrity on public.service_order_partner_accesses;
create trigger partner_access_org_integrity before insert or update on public.service_order_partner_accesses for each row execute function public.assert_field_service_organization_integrity();
drop trigger if exists partner_submission_org_integrity on public.service_order_partner_submissions;
create trigger partner_submission_org_integrity before insert or update on public.service_order_partner_submissions for each row execute function public.assert_field_service_organization_integrity();

create index if not exists service_order_partner_submissions_access_created_idx on public.service_order_partner_submissions(partner_access_id, created_at desc);
create index if not exists service_order_partner_access_active_idx on public.service_order_partner_accesses(service_order_id, expires_at) where revoked_at is null;
