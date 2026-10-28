-- Corrige a ordem transacional da aprovação da OS.
-- O trigger de integridade da OS exige que a fila esteja APPROVED antes
-- de permitir a transição de service_orders para VALIDATED.
-- A função continua atômica: se qualquer etapa falhar, toda a transação volta.
create or replace function public.review_field_service_order(
  target_queue_id uuid,
  target_decision text,
  target_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  item public.field_service_review_queue%rowtype;
  changed integer;
begin
  select * into item
    from public.field_service_review_queue
    where id = target_queue_id
    for update;

  if item.id is null then raise exception 'FIELD_REVIEW_NOT_FOUND'; end if;
  if not public.has_organization_role(item.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[])
    or not exists (select 1 from public.user_profiles where id = auth.uid() and active) then
    raise exception 'FIELD_REVIEW_NOT_AUTHORIZED';
  end if;
  if item.status <> 'PENDING' then raise exception 'FIELD_REVIEW_INVALID_STATE'; end if;
  if target_decision not in ('APPROVE', 'RETURN') then raise exception 'FIELD_REVIEW_INVALID_DECISION'; end if;
  if target_reason is null or length(trim(target_reason)) not between 10 and 2000 then raise exception 'FIELD_REVIEW_REASON_REQUIRED'; end if;

  if target_decision = 'APPROVE' then
    -- Primeiro aprova a fila. O trigger de service_orders valida essa
    -- aprovação antes de aceitar o status VALIDATED.
    update public.field_service_review_queue
      set status = 'APPROVED'::public.field_service_review_status,
          reviewer_id = auth.uid(),
          review_reason = trim(target_reason),
          reviewed_at = clock_timestamp()
      where id = item.id and status = 'PENDING';
    get diagnostics changed = row_count;
    if changed <> 1 then raise exception 'FIELD_REVIEW_CONCURRENT_UPDATE'; end if;

    update public.service_orders
      set status = 'VALIDATED', updated_by = auth.uid(), updated_at = clock_timestamp()
      where id = item.service_order_id
        and organization_id = item.organization_id
        and status = 'COMPLETED';
    get diagnostics changed = row_count;
    if changed <> 1 then raise exception 'FIELD_REVIEW_ORDER_NOT_COMPLETED'; end if;
  else
    update public.service_orders
      set status = 'IN_SERVICE', updated_by = auth.uid(), updated_at = clock_timestamp()
      where id = item.service_order_id
        and organization_id = item.organization_id
        and status = 'COMPLETED';
    get diagnostics changed = row_count;
    if changed <> 1 then raise exception 'FIELD_REVIEW_ORDER_NOT_COMPLETED'; end if;

    insert into public.service_order_events(service_order_id, organization_id, event_type, actor_id, details)
    values (item.service_order_id, item.organization_id, 'SERVICE_STARTED', auth.uid(),
      jsonb_build_object('source', 'GESTOR_REVIEW_RETURN', 'queue_id', item.id, 'reason', trim(target_reason)));

    update public.field_service_review_queue
      set status = 'RETURNED'::public.field_service_review_status,
          reviewer_id = auth.uid(),
          review_reason = trim(target_reason),
          reviewed_at = clock_timestamp()
      where id = item.id and status = 'PENDING';
    get diagnostics changed = row_count;
    if changed <> 1 then raise exception 'FIELD_REVIEW_CONCURRENT_UPDATE'; end if;
  end if;

  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values (item.organization_id, auth.uid(), 'FIELD_SERVICE_REVIEW', 'service_order', item.service_order_id,
    jsonb_build_object('queue_id', item.id, 'decision', target_decision, 'reason', trim(target_reason)), 'WEB');
  return item.id;
end;
$$;

revoke all on function public.review_field_service_order(uuid, text, text) from public;
grant execute on function public.review_field_service_order(uuid, text, text) to authenticated;
