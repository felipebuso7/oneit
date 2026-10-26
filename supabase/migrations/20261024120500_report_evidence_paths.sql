-- Preserva o caminho privado das evidências no snapshot do RTO.
-- A geração do PDF continua responsável por baixar os objetos com credencial server-side.
create or replace function public.prepare_ticket_report(target_ticket_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ticket public.tickets%rowtype; completion public.ticket_completions%rowtype; review public.ticket_reviews%rowtype; result jsonb;
begin
  select * into ticket from public.tickets where id = target_ticket_id for update;
  if ticket.id is null or not public.has_organization_role(ticket.organization_id, array['MANAGER','ORG_ADMIN','SUPER_ADMIN']::public.platform_role[])
    or not exists (select 1 from public.user_profiles where id = auth.uid() and active) then raise exception 'REPORT_NOT_AUTHORIZED'; end if;
  if ticket.operational_status <> 'TECHNICALLY_COMPLETED' or ticket.administrative_status not in ('APPROVED','REPORT_GENERATED') then raise exception 'REPORT_APPROVAL_REQUIRED'; end if;
  select c.* into completion from public.ticket_completions c join public.ticket_reviews r on r.completion_id = c.id
    where c.ticket_id = ticket.id and r.decision = 'APPROVE' order by c.created_at desc limit 1;
  if completion.id is null then raise exception 'REPORT_APPROVAL_REQUIRED'; end if;
  select * into review from public.ticket_reviews where completion_id = completion.id and decision = 'APPROVE';
  result := jsonb_build_object(
    'ticketId', ticket.id, 'organizationId', ticket.organization_id, 'completionId', completion.id,
    'ticketVersion', ticket.version, 'reportVersion', (select coalesce(max(report_version), 0) + 1 from public.ticket_reports where ticket_id = ticket.id),
    'number', ticket.ticket_number, 'title', ticket.title, 'description', ticket.description,
    'milldesk', coalesce(ticket.milldesk_number, ''), 'servicenow', coalesce(ticket.servicenow_number, ''),
    'organization', (select display_name from public.organizations where id = ticket.organization_id),
    'customer', (select name from public.customers where id = ticket.customer_id),
    'location', (select name || ' - ' || city from public.customer_locations where id = ticket.location_id),
    'technician', (select full_name from public.technicians where id = completion.technician_id),
    'reviewer', (select full_name from public.user_profiles where id = review.reviewer_id),
    'approvedAt', review.created_at, 'completedAt', completion.created_at, 'generatedAt', clock_timestamp(),
    'diagnosis', (select diagnosis from public.ticket_execution_records where id = completion.execution_record_id),
    'solution', (select solution from public.ticket_execution_records where id = completion.execution_record_id),
    'noMaterialReason', coalesce(completion.no_material_reason, ''),
    'checklist', coalesce((select jsonb_agg(jsonb_build_object('label', i.label, 'completed', (e.checklist_answers->i.item_code) = 'true'::jsonb) order by i.position) from public.ticket_checklist_items i join public.ticket_execution_records e on e.id = completion.execution_record_id where i.ticket_id = ticket.id), '[]'::jsonb),
    'materials', coalesce((select jsonb_agg(jsonb_build_object('name', material_name, 'quantity', quantity, 'unit', unit)) from public.ticket_materials where id = any(completion.material_ids)), '[]'::jsonb),
    'evidences', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'type', evidence_type, 'size', size_bytes, 'storagePath', storage_path)) from public.ticket_evidences where id = any(completion.evidence_ids)), '[]'::jsonb),
    'checkins', coalesce((select jsonb_agg(jsonb_build_object('type', event_type, 'at', occurred_at) order by occurred_at) from public.ticket_field_events where ticket_id = ticket.id), '[]'::jsonb)
  );
  return result;
end;
$$;

revoke all on function public.prepare_ticket_report(uuid) from public;
grant execute on function public.prepare_ticket_report(uuid) to authenticated;
