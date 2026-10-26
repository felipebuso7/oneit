-- Finance users operate batches through checked RPCs. The provider worker
-- advances a READY batch only after its fiscal email is recorded as SENT.
drop policy if exists "finance managers manage fiscal batches" on public.fiscal_batches;
revoke insert, update, delete on public.fiscal_batches from public, anon, authenticated;

alter function public.create_fiscal_batch(uuid, date, uuid) security definer;
alter function public.close_fiscal_batch(uuid, uuid) security definer;
revoke all on function public.create_fiscal_batch(uuid, date, uuid) from public, anon;
revoke all on function public.close_fiscal_batch(uuid, uuid) from public, anon;
grant execute on function public.create_fiscal_batch(uuid, date, uuid) to authenticated;
grant execute on function public.close_fiscal_batch(uuid, uuid) to authenticated;

-- The API supplies target_actor for existing clients. A direct RPC caller must
-- not be able to attribute financial events to another person.
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
  update public.measurement_sheets set sent_to_tax_at = now(), sent_to_tax_by = auth.uid() where id = any(selected_ids);
  update public.billing_periods set status = 'SENT_TO_TAX' where competence = target_competence and organization_id = target_organization_id;
  insert into public.measurement_sheet_events(measurement_sheet_id, organization_id, event_type, actor_id, metadata)
    select id, target_organization_id, 'SENT_TO_TAX', auth.uid(), jsonb_build_object('fiscal_batch_id', result.id, 'batch_number', batch_code)
      from public.measurement_sheets where id = any(selected_ids);
  return result;
end;
$$;

create or replace function public.close_fiscal_batch(
  target_batch_id uuid,
  target_actor uuid default null
) returns public.fiscal_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  batch public.fiscal_batches;
  sheet_id uuid;
begin
  if auth.uid() is null or target_actor is distinct from auth.uid() then raise exception 'fiscal_batch_forbidden'; end if;
  select * into batch from public.fiscal_batches where id = target_batch_id for update;
  if not found then raise exception 'fiscal_batch_not_found'; end if;
  if not public.has_organization_role(batch.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]) then raise exception 'fiscal_batch_forbidden'; end if;
  if batch.status <> 'SENT' then raise exception 'fiscal_batch_invalid_state'; end if;
  update public.fiscal_batches set status = 'CLOSED', closed_at = now(), sent_at = coalesce(sent_at, now()) where id = target_batch_id returning * into batch;
  foreach sheet_id in array batch.measurement_sheet_ids loop
    insert into public.measurement_sheet_events(measurement_sheet_id, organization_id, event_type, actor_id, metadata)
    values (sheet_id, batch.organization_id, 'CLOSED', auth.uid(), jsonb_build_object('fiscal_batch_id', batch.id, 'batch_number', batch.batch_number));
  end loop;
  return batch;
end;
$$;

create or replace function public.sync_fiscal_batch_after_email_acceptance()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.status is distinct from new.status
     and new.status = 'SENT'
     and new.email_type = 'FISCAL'
     and new.fiscal_batch_id is not null
     and new.sent_at is not null then
    update public.fiscal_batches
       set status = 'SENT', sent_at = new.sent_at
     where id = new.fiscal_batch_id
       and organization_id = new.organization_id
       and status = 'READY';
  end if;
  return new;
end;
$$;

create trigger fiscal_batch_email_acceptance
  after update of status on public.billing_email_log
  for each row execute function public.sync_fiscal_batch_after_email_acceptance();

create or replace function public.prevent_closed_fiscal_batch_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'CLOSED' and new is distinct from old then
    raise exception 'closed_fiscal_batch_immutable';
  end if;
  if old.status = 'SENT' and (
    new.status <> 'CLOSED' or
    (new.organization_id, new.competence, new.batch_number, new.measurement_sheet_ids,
     new.total_amount, new.pdf_hash, new.sent_at) is distinct from
    (old.organization_id, old.competence, old.batch_number, old.measurement_sheet_ids,
     old.total_amount, old.pdf_hash, old.sent_at)
  ) then
    raise exception 'sent_fiscal_batch_immutable';
  end if;
  return new;
end;
$$;
