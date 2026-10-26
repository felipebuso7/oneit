create or replace function public.close_fiscal_batch(
  target_batch_id uuid,
  target_actor uuid default null
) returns public.fiscal_batches
language plpgsql
security invoker
set search_path = public
as $$
declare
  batch public.fiscal_batches;
  sheet_id uuid;
begin
  select * into batch from public.fiscal_batches where id = target_batch_id for update;
  if not found then raise exception 'fiscal_batch_not_found'; end if;
  if not public.has_organization_role(batch.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]) then raise exception 'fiscal_batch_forbidden'; end if;
  if batch.status <> 'SENT' then raise exception 'fiscal_batch_invalid_state'; end if;
  update public.fiscal_batches set status = 'CLOSED', closed_at = now(), sent_at = coalesce(sent_at, now()) where id = target_batch_id returning * into batch;
  foreach sheet_id in array batch.measurement_sheet_ids loop
    insert into public.measurement_sheet_events(measurement_sheet_id, organization_id, event_type, actor_id, metadata)
    values (sheet_id, batch.organization_id, 'CLOSED', target_actor, jsonb_build_object('fiscal_batch_id', batch.id, 'batch_number', batch.batch_number));
  end loop;
  return batch;
end;
$$;

comment on function public.close_fiscal_batch(uuid, uuid) is 'Fecha lote fiscal enviado e registra evidência de encerramento.';
