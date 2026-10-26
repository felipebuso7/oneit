-- Consolida os BMs aprovados de uma competência em um único lote fiscal.
create or replace function public.create_fiscal_batch(
  target_organization_id uuid,
  target_competence date,
  target_actor uuid default null
) returns public.fiscal_batches
language plpgsql
security invoker
set search_path = public
as $$
declare
  result public.fiscal_batches;
  selected_ids uuid[];
  selected_total numeric(14,2);
  batch_code text;
begin
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
  update public.measurement_sheets set sent_to_tax_at = now(), sent_to_tax_by = target_actor where id = any(selected_ids);
  update public.billing_periods set status = 'SENT_TO_TAX' where competence = target_competence and organization_id = target_organization_id;
  insert into public.measurement_sheet_events(measurement_sheet_id, organization_id, event_type, actor_id, metadata)
    select id, target_organization_id, 'SENT_TO_TAX', target_actor, jsonb_build_object('fiscal_batch_id', result.id, 'batch_number', batch_code)
      from public.measurement_sheets where id = any(selected_ids);
  return result;
end;
$$;

comment on function public.create_fiscal_batch(uuid, date, uuid) is 'Consolida BMs aprovados de uma competência em lote fiscal único.';
