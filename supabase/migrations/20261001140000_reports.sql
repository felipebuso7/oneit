create table public.ticket_reports (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  completion_id uuid not null references public.ticket_completions(id) on delete restrict,
  report_version integer not null check (report_version > 0),
  snapshot jsonb not null,
  storage_path text not null unique,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  generated_by uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(ticket_id, report_version)
);
alter table public.ticket_reports enable row level security;
create policy "read visible ticket reports" on public.ticket_reports for select to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_id));
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('ticket-reports', 'ticket-reports', false, 10485760, array['application/pdf']);
create policy "read registered ticket reports" on storage.objects for select to authenticated using (bucket_id = 'ticket-reports' and exists (select 1 from public.ticket_reports r where r.storage_path = name));

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
    'evidences', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'type', evidence_type, 'size', size_bytes)) from public.ticket_evidences where id = any(completion.evidence_ids)), '[]'::jsonb),
    'checkins', coalesce((select jsonb_agg(jsonb_build_object('type', event_type, 'at', occurred_at) order by occurred_at) from public.ticket_field_events where ticket_id = ticket.id), '[]'::jsonb)
  );
  return result;
end;
$$;

create or replace function public.register_ticket_report(target_ticket_id uuid, expected_version integer, target_report_version integer, target_snapshot jsonb, target_path text, target_sha256 text)
returns uuid language plpgsql security definer set search_path = public as $$
declare current_snapshot jsonb; report_id uuid;
begin
  current_snapshot := public.prepare_ticket_report(target_ticket_id);
  if expected_version is null or (current_snapshot->>'ticketVersion')::integer <> expected_version
    or target_report_version is null or (current_snapshot->>'reportVersion')::integer <> target_report_version then raise exception 'REPORT_VERSION_CONFLICT'; end if;
  -- generatedAt is the only nondeterministic field between prepare and registration.
  if target_snapshot is null or (current_snapshot - 'generatedAt') is distinct from (target_snapshot - 'generatedAt') then raise exception 'REPORT_SNAPSHOT_CHANGED'; end if;
  if target_path not like (current_snapshot->>'organizationId') || '/' || target_ticket_id::text || '/%' then raise exception 'REPORT_INVALID_PATH'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'ticket-reports' and name = target_path and metadata->>'mimetype' = 'application/pdf') then raise exception 'REPORT_OBJECT_MISSING'; end if;
  insert into public.ticket_reports(ticket_id, completion_id, report_version, snapshot, storage_path, sha256, generated_by)
  values (target_ticket_id, (current_snapshot->>'completionId')::uuid, target_report_version, target_snapshot, target_path, target_sha256, auth.uid()) returning id into report_id;
  update public.tickets set administrative_status = 'REPORT_GENERATED' where id = target_ticket_id;
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values ((current_snapshot->>'organizationId')::uuid, auth.uid(), 'REPORT_GENERATED', 'ticket', target_ticket_id, jsonb_build_object('report_id', report_id, 'version', target_report_version, 'sha256', target_sha256), 'WEB');
  return report_id;
end;
$$;
revoke all on function public.prepare_ticket_report(uuid), public.register_ticket_report(uuid, integer, integer, jsonb, text, text) from public;
grant execute on function public.prepare_ticket_report(uuid), public.register_ticket_report(uuid, integer, integer, jsonb, text, text) to authenticated;
