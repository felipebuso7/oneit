-- O técnico interno conclui pela trilha ticket_completions, enquanto o parceiro
-- usa service_order_partner_submissions. O RTO deve consolidar ambos os fluxos.
create or replace function public.generate_field_service_rto(target_queue_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  item public.field_service_review_queue%rowtype;
  order_record public.service_orders%rowtype;
  submission_record public.service_order_partner_submissions%rowtype;
  completion_record public.ticket_completions%rowtype;
  execution_record public.ticket_execution_records%rowtype;
  report_id uuid;
  snapshot_value jsonb;
  next_version integer;
  execution_text text;
  evidence_value jsonb;
begin
  select * into item from public.field_service_review_queue where id = target_queue_id for update;
  if item.id is null or item.status <> 'APPROVED' then raise exception 'RTO_REVIEW_REQUIRED'; end if;
  if not public.has_organization_role(item.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[])
    or not exists (select 1 from public.user_profiles where id = auth.uid() and active) then
    raise exception 'RTO_NOT_AUTHORIZED';
  end if;

  select * into order_record from public.service_orders where id = item.service_order_id;
  select * into submission_record from public.service_order_partner_submissions where id = item.submission_id;
  select * into completion_record from public.ticket_completions where ticket_id = item.ticket_id order by created_at desc limit 1;
  select * into execution_record from public.ticket_execution_records where ticket_id = item.ticket_id order by created_at desc limit 1;
  if order_record.id is null or (submission_record.id is null and completion_record.id is null) then
    raise exception 'RTO_DATA_INCOMPLETE';
  end if;

  if submission_record.id is not null then
    execution_text := submission_record.execution_report;
    evidence_value := coalesce(submission_record.evidence, '[]'::jsonb);
  else
    if execution_record.id is null then raise exception 'RTO_DATA_INCOMPLETE'; end if;
    execution_text := format('Diagnóstico: %s\n\nServiço executado: %s', execution_record.diagnosis, execution_record.solution);
    evidence_value := coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', evidence.id,
        'name', evidence.evidence_type,
        'mime', evidence.mime_type,
        'storagePath', evidence.storage_path
      ) order by evidence.created_at)
      from public.ticket_evidences evidence
      where evidence.id = any(completion_record.evidence_ids)
    ), '[]'::jsonb);
  end if;

  select coalesce(max(report_version), 0) + 1 into next_version
    from public.field_service_rto_reports where service_order_id = order_record.id;
  snapshot_value := jsonb_build_object(
    'service_order_id', order_record.id,
    'ticket_id', order_record.ticket_id,
    'order_number', order_record.order_number,
    'status', order_record.status,
    'scheduled_at', order_record.scheduled_at,
    'checked_in_at', order_record.checked_in_at,
    'checked_out_at', order_record.checked_out_at,
    'execution_report', execution_text,
    'customer_signature_name', case when submission_record.id is not null then submission_record.customer_signature_name else null end,
    'customer_signature_data_url', case when submission_record.id is not null then submission_record.customer_signature_data_url else null end,
    'evidence', evidence_value,
    'lpu_lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', lpu_code, 'description', description, 'unit', unit,
        'quantity', quantity, 'unit_price', unit_price,
        'total', round(quantity * unit_price, 2)
      ) order by created_at)
      from public.field_service_order_lpu_lines where service_order_id = order_record.id
    ), '[]'::jsonb)
  );

  insert into public.field_service_rto_reports(organization_id, service_order_id, ticket_id, report_version, snapshot, generated_by)
  values(item.organization_id, order_record.id, order_record.ticket_id, next_version, snapshot_value, auth.uid())
  on conflict (service_order_id) do update
    set report_version = excluded.report_version,
        snapshot = excluded.snapshot,
        generated_by = excluded.generated_by,
        generated_at = clock_timestamp()
  returning id into report_id;

  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values(item.organization_id, auth.uid(), 'FIELD_SERVICE_RTO_GENERATED', 'service_order', order_record.id,
    jsonb_build_object('report_id', report_id, 'version', next_version,
      'execution_source', case when submission_record.id is not null then 'PARTNER_SUBMISSION' else 'INTERNAL_COMPLETION' end), 'WEB');
  return report_id;
end;
$$;

revoke all on function public.generate_field_service_rto(uuid) from public;
grant execute on function public.generate_field_service_rto(uuid) to authenticated;
