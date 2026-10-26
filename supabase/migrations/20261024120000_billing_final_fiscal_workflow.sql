-- Fluxo final do BM: correção, encaminhamento ao faturamento e encerramento imutável.
alter table public.billing_periods drop constraint if exists billing_periods_check;
alter table public.billing_periods add constraint billing_periods_contestation_consistency check
  ((status in ('SENT_FOR_CONTESTATION', 'CONTESTED', 'APPROVED', 'SENT_TO_TAX', 'RETURNED_FOR_CORRECTION', 'SENT_TO_BILLING', 'CLOSED')) = (contestation_deadline is not null));

alter table public.measurement_sheets add column if not exists sent_to_billing_at timestamptz;
alter table public.measurement_sheets add column if not exists sent_to_billing_by uuid references public.user_profiles(id) on delete set null;
alter table public.measurement_sheets add column if not exists final_email_sent_at timestamptz;
alter table public.measurement_sheets add column if not exists final_email_sent_by uuid references public.user_profiles(id) on delete set null;

create or replace function public.transition_measurement_sheet(
  target_sheet_id uuid,
  target_status text,
  target_actor uuid default null,
  target_metadata jsonb default '{}'::jsonb
) returns public.measurement_sheets
language plpgsql security invoker set search_path = public as $$
declare current_sheet public.measurement_sheets; period_status public.measurement_status; effective_actor uuid := auth.uid(); allowed boolean := false;
begin
  if effective_actor is null then raise exception 'measurement_transition_auth_required'; end if;
  if pg_column_size(coalesce(target_metadata, '{}'::jsonb)) > 32768 then raise exception 'measurement_transition_metadata_too_large'; end if;
  select * into current_sheet from public.measurement_sheets where id = target_sheet_id for update;
  if not found then raise exception 'measurement_sheet_not_found'; end if;
  if not public.has_organization_role(current_sheet.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]) then raise exception 'measurement_transition_forbidden'; end if;
  select status into period_status from public.billing_periods where id = current_sheet.billing_period_id for update;
  allowed := (period_status = 'DRAFT' and target_status = 'READY_FOR_REVIEW')
    or (period_status = 'READY_FOR_REVIEW' and target_status = 'SENT_FOR_CONTESTATION')
    or (period_status in ('SENT_FOR_CONTESTATION', 'CONTESTED') and target_status = 'APPROVED')
    or (period_status = 'APPROVED' and target_status = 'SENT_TO_TAX')
    or (period_status = 'SENT_TO_TAX' and target_status in ('RETURNED_FOR_CORRECTION', 'SENT_TO_BILLING'))
    or (period_status = 'RETURNED_FOR_CORRECTION' and target_status = 'READY_FOR_REVIEW')
    or (period_status = 'SENT_TO_BILLING' and target_status = 'CLOSED');
  if not allowed then raise exception 'invalid_measurement_transition: %', target_status; end if;
  if target_status = 'SENT_FOR_CONTESTATION' then
    update public.measurement_sheets set sent_to_customer_at = now(), sent_to_customer_by = effective_actor where id = target_sheet_id;
    update public.billing_periods set status = 'SENT_FOR_CONTESTATION', contestation_deadline = now() + interval '72 hours' where id = current_sheet.billing_period_id;
  elsif target_status = 'APPROVED' then
    update public.measurement_sheets set approved_at = now(), approved_by = effective_actor where id = target_sheet_id;
    update public.billing_periods set status = 'APPROVED' where id = current_sheet.billing_period_id;
  elsif target_status = 'SENT_TO_TAX' then
    update public.measurement_sheets set sent_to_tax_at = now(), sent_to_tax_by = effective_actor where id = target_sheet_id;
    update public.billing_periods set status = 'SENT_TO_TAX' where id = current_sheet.billing_period_id;
  elsif target_status = 'RETURNED_FOR_CORRECTION' then
    update public.billing_periods set status = 'RETURNED_FOR_CORRECTION' where id = current_sheet.billing_period_id;
  elsif target_status = 'READY_FOR_REVIEW' then
    update public.billing_periods set status = 'READY_FOR_REVIEW' where id = current_sheet.billing_period_id;
  elsif target_status = 'SENT_TO_BILLING' then
    update public.measurement_sheets set sent_to_billing_at = now(), sent_to_billing_by = effective_actor where id = target_sheet_id;
    update public.billing_periods set status = 'SENT_TO_BILLING' where id = current_sheet.billing_period_id;
  elsif target_status = 'CLOSED' then
    update public.measurement_sheets set final_email_sent_at = now(), final_email_sent_by = effective_actor where id = target_sheet_id;
    update public.billing_periods set status = 'CLOSED', closed_at = now(), closed_by = effective_actor where id = current_sheet.billing_period_id;
  end if;
  select * into current_sheet from public.measurement_sheets where id = target_sheet_id;
  insert into public.measurement_sheet_events(measurement_sheet_id, organization_id, event_type, actor_id, metadata)
  values (target_sheet_id, current_sheet.organization_id, case target_status when 'READY_FOR_REVIEW' then 'CALCULATED' when 'SENT_FOR_CONTESTATION' then 'ISSUED' when 'APPROVED' then 'APPROVED' when 'SENT_TO_TAX' then 'SENT_TO_TAX' when 'RETURNED_FOR_CORRECTION' then 'CONTESTATION_RESOLVED' when 'SENT_TO_BILLING' then 'SENT_TO_TAX' when 'CLOSED' then 'CLOSED' end, effective_actor, target_metadata);
  return current_sheet;
end; $$;
