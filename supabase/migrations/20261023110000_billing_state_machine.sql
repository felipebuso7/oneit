-- Máquina de estados transacional do BM. A UI não pode pular etapas financeiras.
create or replace function public.transition_measurement_sheet(
  target_sheet_id uuid,
  target_status text,
  target_actor uuid default null,
  target_metadata jsonb default '{}'::jsonb
) returns public.measurement_sheets
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_sheet public.measurement_sheets;
  period_status public.measurement_status;
  allowed boolean := false;
begin
  select * into current_sheet from public.measurement_sheets where id = target_sheet_id for update;
  if not found then raise exception 'measurement_sheet_not_found'; end if;
  if not public.has_organization_role(current_sheet.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]) then raise exception 'measurement_transition_forbidden'; end if;
  select status into period_status from public.billing_periods where id = current_sheet.billing_period_id for update;

  allowed := (period_status = 'DRAFT' and target_status = 'READY_FOR_REVIEW')
    or (period_status = 'READY_FOR_REVIEW' and target_status = 'SENT_FOR_CONTESTATION')
    or (period_status in ('SENT_FOR_CONTESTATION', 'CONTESTED') and target_status = 'APPROVED')
    or (period_status = 'APPROVED' and target_status = 'SENT_TO_TAX')
    or (period_status = 'SENT_TO_TAX' and target_status = 'CLOSED');
  if not allowed then raise exception 'invalid_measurement_transition: %', target_status; end if;

  if target_status = 'SENT_FOR_CONTESTATION' then
    update public.measurement_sheets set sent_to_customer_at = now(), sent_to_customer_by = target_actor where id = target_sheet_id;
    update public.billing_periods set status = 'SENT_FOR_CONTESTATION', contestation_deadline = now() + interval '72 hours' where id = current_sheet.billing_period_id;
  elsif target_status = 'APPROVED' then
    update public.measurement_sheets set approved_at = now(), approved_by = target_actor where id = target_sheet_id;
    update public.billing_periods set status = 'APPROVED' where id = current_sheet.billing_period_id;
  elsif target_status = 'SENT_TO_TAX' then
    update public.measurement_sheets set sent_to_tax_at = now(), sent_to_tax_by = target_actor where id = target_sheet_id;
    update public.billing_periods set status = 'SENT_TO_TAX' where id = current_sheet.billing_period_id;
  elsif target_status = 'CLOSED' then
    update public.billing_periods set status = 'CLOSED', closed_at = now(), closed_by = target_actor where id = current_sheet.billing_period_id;
  end if;

  select * into current_sheet from public.measurement_sheets where id = target_sheet_id;
  insert into public.measurement_sheet_events(measurement_sheet_id, organization_id, event_type, actor_id, metadata)
  values (target_sheet_id, current_sheet.organization_id,
    case target_status when 'READY_FOR_REVIEW' then 'CALCULATED' when 'SENT_FOR_CONTESTATION' then 'ISSUED' when 'APPROVED' then 'APPROVED' when 'SENT_TO_TAX' then 'SENT_TO_TAX' when 'CLOSED' then 'CLOSED' end,
    target_actor, target_metadata);
  return current_sheet;
end;
$$;

comment on function public.transition_measurement_sheet(uuid, text, uuid, jsonb) is 'Aplica transições financeiras válidas do BM com lock e auditoria.';
