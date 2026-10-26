create or replace function public.recalculate_measurement_sheet(
  target_sheet_id uuid,
  target_actor uuid default null,
  target_reason text default 'CONTESTATION'
) returns public.measurement_sheet_versions
language plpgsql
security invoker
set search_path = public
as $$
declare
  sheet public.measurement_sheets;
  period public.billing_periods;
  latest public.measurement_sheet_versions;
  created public.measurement_sheet_versions;
  next_version integer;
  calculated_total numeric(14,2);
  calculated_orders integer;
  calculation_hash text;
begin
  select * into sheet from public.measurement_sheets where id = target_sheet_id for update;
  if not found then raise exception 'measurement_sheet_not_found'; end if;
  if not public.has_organization_role(sheet.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]) then raise exception 'measurement_recalculation_forbidden'; end if;
  select * into period from public.billing_periods where id = sheet.billing_period_id for update;
  if period.status <> 'CONTESTED' then raise exception 'measurement_recalculation_invalid_state'; end if;
  select * into latest from public.measurement_sheet_versions where measurement_sheet_id = sheet.id order by version desc limit 1;
  select coalesce(sum(total_price), 0), count(distinct ticket_id) into calculated_total, calculated_orders from public.measurement_sheet_lines where measurement_sheet_id = sheet.id;
  next_version := coalesce(latest.version, 0) + 1;
  calculation_hash := md5(target_sheet_id::text || ':' || next_version::text || ':' || calculated_total::text || ':' || now()::text);
  if latest.id is not null then update public.measurement_sheet_versions set status = 'SUPERSEDED', superseded_at = now() where id = latest.id; end if;
  insert into public.measurement_sheet_versions(measurement_sheet_id, billing_period_id, organization_id, version, status, source_version_id, total_orders, total_amount, calculation_hash, snapshot, issued_at, issued_by)
  values (sheet.id, sheet.billing_period_id, sheet.organization_id, next_version, 'ISSUED', latest.id, calculated_orders, calculated_total, calculation_hash, jsonb_build_object('reason', target_reason, 'recalculated_at', now()), now(), target_actor)
  returning * into created;
  update public.measurement_sheets set total_orders = calculated_orders, total_amount = calculated_total, approved_at = null, approved_by = null, sent_to_tax_at = null, sent_to_tax_by = null where id = sheet.id;
  update public.billing_periods set status = 'READY_FOR_REVIEW', contestation_deadline = null where id = sheet.billing_period_id;
  insert into public.measurement_sheet_events(measurement_sheet_id, measurement_sheet_version_id, organization_id, event_type, actor_id, metadata) values (sheet.id, created.id, sheet.organization_id, 'CALCULATED', target_actor, jsonb_build_object('reason', target_reason, 'version', next_version));
  return created;
end;
$$;
