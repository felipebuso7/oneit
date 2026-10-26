create table public.field_service_rto_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  service_order_id uuid not null unique references public.service_orders(id) on delete restrict,
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  report_version integer not null default 1 check (report_version > 0),
  snapshot jsonb not null,
  generated_by uuid not null references public.user_profiles(id) on delete restrict,
  generated_at timestamptz not null default now(),
  storage_path text,
  sha256 text,
  check (jsonb_typeof(snapshot) = 'object')
);
create index field_service_rto_org_date_idx on public.field_service_rto_reports(organization_id, generated_at desc);
alter table public.field_service_rto_reports enable row level security;
create policy "members read field service rto" on public.field_service_rto_reports for select to authenticated using (public.is_organization_member(organization_id));
create policy "managers create field service rto" on public.field_service_rto_reports for insert to authenticated with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]));

create or replace function public.generate_field_service_rto(target_queue_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare item public.field_service_review_queue%rowtype; order_record public.service_orders%rowtype; submission_record public.service_order_partner_submissions%rowtype; report_id uuid; snapshot_value jsonb; next_version integer;
begin
  select * into item from public.field_service_review_queue where id = target_queue_id for update;
  if item.id is null or item.status <> 'APPROVED' then raise exception 'RTO_REVIEW_REQUIRED'; end if;
  if not public.has_organization_role(item.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]) then raise exception 'RTO_NOT_AUTHORIZED'; end if;
  select * into order_record from public.service_orders where id = item.service_order_id;
  select * into submission_record from public.service_order_partner_submissions where id = item.submission_id;
  if order_record.id is null or submission_record.id is null then raise exception 'RTO_DATA_INCOMPLETE'; end if;
  select coalesce(max(report_version), 0) + 1 into next_version from public.field_service_rto_reports where service_order_id = order_record.id;
  snapshot_value := jsonb_build_object(
    'service_order_id', order_record.id, 'ticket_id', order_record.ticket_id, 'order_number', order_record.order_number,
    'status', order_record.status, 'scheduled_at', order_record.scheduled_at, 'checked_in_at', order_record.checked_in_at,
    'checked_out_at', order_record.checked_out_at, 'execution_report', submission_record.execution_report,
    'customer_signature_name', submission_record.customer_signature_name, 'customer_signature_data_url', submission_record.customer_signature_data_url,
    'evidence', coalesce(submission_record.evidence, '[]'::jsonb),
    'lpu_lines', coalesce((select jsonb_agg(jsonb_build_object('code', lpu_code, 'description', description, 'unit', unit, 'quantity', quantity, 'unit_price', unit_price, 'total', round(quantity * unit_price, 2)) order by created_at) from public.field_service_order_lpu_lines where service_order_id = order_record.id), '[]'::jsonb)
  );
  insert into public.field_service_rto_reports(organization_id, service_order_id, ticket_id, report_version, snapshot, generated_by)
  values(item.organization_id, order_record.id, order_record.ticket_id, next_version, snapshot_value, auth.uid())
  on conflict (service_order_id) do update set report_version = excluded.report_version, snapshot = excluded.snapshot, generated_by = excluded.generated_by, generated_at = clock_timestamp()
  returning id into report_id;
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values(item.organization_id, auth.uid(), 'FIELD_SERVICE_RTO_GENERATED', 'service_order', order_record.id, jsonb_build_object('report_id', report_id, 'version', next_version), 'WEB');
  return report_id;
end;
$$;
revoke all on function public.generate_field_service_rto(uuid) from public;
grant execute on function public.generate_field_service_rto(uuid) to authenticated;

create or replace function public.register_field_service_rto_file(target_report_id uuid, target_storage_path text, target_sha256 text)
returns void language plpgsql security definer set search_path = public as $$
declare report public.field_service_rto_reports%rowtype;
begin
  select * into report from public.field_service_rto_reports where id = target_report_id for update;
  if report.id is null or not public.has_organization_role(report.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]) then raise exception 'RTO_NOT_AUTHORIZED'; end if;
  if target_storage_path is null or target_storage_path not like report.organization_id::text || '/field-service/' || report.service_order_id::text || '/rto-v%.pdf' then raise exception 'RTO_PATH_INVALID'; end if;
  if target_sha256 is null or target_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'RTO_HASH_INVALID'; end if;
  update public.field_service_rto_reports set storage_path = target_storage_path, sha256 = target_sha256 where id = report.id;
end;
$$;
revoke all on function public.register_field_service_rto_file(uuid, text, text) from public;
grant execute on function public.register_field_service_rto_file(uuid, text, text) to authenticated;
