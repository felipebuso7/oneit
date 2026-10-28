-- A fiscal batch is only accepted by the tax flow after the provider confirms
-- the fiscal e-mail. Creating the batch is a preparation step and must not
-- mark its BMs or competence as sent prematurely.
create or replace function public.create_fiscal_batch(
  target_organization_id uuid,
  target_competence date,
  target_actor uuid default null
) returns public.fiscal_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.fiscal_batches;
  selected_ids uuid[];
  selected_total numeric(14,2);
  batch_code text;
begin
  if auth.uid() is null or target_actor is distinct from auth.uid() then raise exception 'fiscal_batch_forbidden'; end if;
  if date_trunc('month', target_competence)::date <> target_competence then raise exception 'fiscal_competence_must_be_month_start'; end if;
  if not public.has_organization_role(target_organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]) then raise exception 'fiscal_batch_forbidden'; end if;
  select coalesce(array_agg(s.id order by s.created_at), '{}'), coalesce(sum(s.total_amount), 0)
    into selected_ids, selected_total
    from public.measurement_sheets s
    join public.billing_periods p on p.id = s.billing_period_id
   where s.organization_id = target_organization_id
     and p.competence = target_competence
     and p.status = 'APPROVED'
     and s.approved_at is not null
     and s.sent_to_tax_at is null;
  if coalesce(array_length(selected_ids, 1), 0) = 0 then raise exception 'fiscal_no_approved_measurements'; end if;
  batch_code := 'FISCAL-' || to_char(target_competence, 'YYYY-MM');
  insert into public.fiscal_batches(organization_id, competence, batch_number, status, measurement_sheet_ids, total_amount)
  values (target_organization_id, target_competence, batch_code, 'READY', selected_ids, selected_total)
  on conflict (organization_id, competence) do update
    set measurement_sheet_ids = excluded.measurement_sheet_ids, total_amount = excluded.total_amount, status = 'READY'
  returning * into result;
  -- Promotion to SENT_TO_TAX happens only after the worker records SENT.
  return result;
end;
$$;

create or replace function public.sync_fiscal_batch_after_email_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  batch public.fiscal_batches;
begin
  if old.status is distinct from new.status
     and new.status = 'SENT'
     and new.email_type = 'FISCAL'
     and new.fiscal_batch_id is not null
     and new.sent_at is not null then
    select * into batch from public.fiscal_batches where id = new.fiscal_batch_id for update;
    if found and batch.organization_id = new.organization_id and batch.status = 'READY' then
      update public.fiscal_batches
         set status = 'SENT', sent_at = new.sent_at
       where id = batch.id;
      update public.measurement_sheets
         set sent_to_tax_at = new.sent_at, sent_to_tax_by = coalesce(sent_to_tax_by, new.created_by)
       where id = any(batch.measurement_sheet_ids) and sent_to_tax_at is null;
      update public.billing_periods
         set status = 'SENT_TO_TAX'
       where organization_id = batch.organization_id
         and competence = batch.competence
         and status = 'APPROVED';
      insert into public.measurement_sheet_events(measurement_sheet_id, organization_id, event_type, actor_id, metadata)
        select id, batch.organization_id, 'SENT_TO_TAX', new.created_by,
               jsonb_build_object('fiscal_batch_id', batch.id, 'batch_number', batch.batch_number, 'email_log_id', new.id)
          from public.measurement_sheets where id = any(batch.measurement_sheet_ids);
    end if;
  end if;
  return new;
end;
$$;

comment on function public.create_fiscal_batch(uuid, date, uuid) is 'Prepara lote fiscal; a competência só é enviada após confirmação do e-mail fiscal.';
