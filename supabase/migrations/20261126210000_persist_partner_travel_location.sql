-- Persiste a localização capturada no início do deslocamento no histórico da OS.
-- O evento continua protegido pelo mesmo RLS da ordem e mantém rastreabilidade.
create or replace function public.submit_partner_service_order_event(
  target_token text,
  target_code text,
  target_event text,
  target_location jsonb default null,
  target_report text default null,
  target_evidence jsonb default '[]'::jsonb,
  target_signature_name text default null,
  target_signature_data_url text default null
)
returns void language plpgsql security definer set search_path=public as $$
declare
  access_record public.service_order_partner_accesses%rowtype;
  order_record public.service_orders%rowtype;
  submission_id uuid;
  expected_prefix text;
begin
  access_record := public.assert_partner_access(target_token, target_code);
  select * into order_record from public.service_orders where id = access_record.service_order_id for update;
  if target_event not in ('TRAVEL_STARTED','CHECK_IN','CHECK_OUT','SUBMIT') then raise exception 'PARTNER_EVENT_INVALID'; end if;
  if target_location is not null and jsonb_typeof(target_location) <> 'object' then raise exception 'PARTNER_LOCATION_INVALID'; end if;
  if jsonb_typeof(coalesce(target_evidence, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(target_evidence, '[]'::jsonb)) > 8 then raise exception 'PARTNER_EVIDENCE_INVALID'; end if;
  expected_prefix := 'partner/' || order_record.id::text || '/';
  if exists (select 1 from jsonb_array_elements(coalesce(target_evidence, '[]'::jsonb)) item where jsonb_typeof(item) <> 'object' or coalesce(item->>'storagePath','') not like expected_prefix || '%' or coalesce(item->>'mime','') not in ('image/jpeg','image/png','image/webp') or coalesce(item->>'size','') !~ '^[0-9]+$' or (item->>'size')::bigint not between 1 and 4194304) then raise exception 'PARTNER_EVIDENCE_INVALID'; end if;
  if target_signature_data_url is not null and (length(target_signature_data_url) > 262144 or target_signature_data_url !~ '^data:image/png;base64,[A-Za-z0-9+/=[:space:]]+$') then raise exception 'PARTNER_SIGNATURE_INVALID'; end if;
  if target_event = 'TRAVEL_STARTED' then
    if order_record.status <> 'DISPATCHED' then raise exception 'PARTNER_EVENT_INVALID_STATE'; end if;
    update public.service_orders set status = 'TRAVELING', updated_by = null where id = order_record.id;
    insert into public.service_order_events(service_order_id, organization_id, event_type, actor_id, details)
    values(order_record.id, order_record.organization_id, 'TRAVELING', null, jsonb_build_object('source','PARTNER_ACCESS','location',coalesce(target_location, '{}'::jsonb)));
  elsif target_event = 'CHECK_IN' then
    if order_record.status <> 'TRAVELING' then raise exception 'PARTNER_EVENT_INVALID_STATE'; end if;
    update public.service_orders set status = 'CHECKED_IN', checked_in_at = clock_timestamp(), updated_by = null where id = order_record.id;
    insert into public.service_order_partner_submissions(partner_access_id, organization_id, checked_in_at, checked_in_location, evidence) values(access_record.id, access_record.organization_id, clock_timestamp(), target_location, target_evidence) returning id into submission_id;
    insert into public.service_order_events(service_order_id, organization_id, event_type, actor_id, details) values(order_record.id, order_record.organization_id, 'CHECK_IN', null, jsonb_build_object('source','PARTNER_ACCESS','submission_id',submission_id));
  elsif target_event = 'SUBMIT' then
    if order_record.status not in ('CHECKED_IN','IN_SERVICE') then raise exception 'PARTNER_EVENT_INVALID_STATE'; end if;
    if length(trim(coalesce(target_report,''))) not between 10 and 10000 then raise exception 'PARTNER_REPORT_INVALID'; end if;
    if length(trim(coalesce(target_signature_name,''))) not between 2 and 160 or target_signature_data_url is null then raise exception 'PARTNER_SIGNATURE_REQUIRED'; end if;
    if jsonb_array_length(coalesce(target_evidence, '[]'::jsonb)) < 3 then raise exception 'PARTNER_EVIDENCE_REQUIRED'; end if;
    update public.service_orders set status = 'IN_SERVICE', updated_by = null where id = order_record.id;
    insert into public.service_order_partner_submissions(partner_access_id, organization_id, execution_report, submitted_at, evidence, customer_signature_name, customer_signature_data_url) values(access_record.id, access_record.organization_id, trim(target_report), clock_timestamp(), target_evidence, trim(target_signature_name), target_signature_data_url) returning id into submission_id;
    insert into public.service_order_events(service_order_id, organization_id, event_type, actor_id, details) values(order_record.id, order_record.organization_id, 'SERVICE_STARTED', null, jsonb_build_object('source','PARTNER_ACCESS','stage','REPORT_SUBMITTED','submission_id',submission_id));
  else
    if order_record.status <> 'IN_SERVICE' then raise exception 'PARTNER_EVENT_INVALID_STATE'; end if;
    if not exists (select 1 from public.service_order_partner_submissions submission where submission.partner_access_id = access_record.id and submission.submitted_at is not null and length(trim(coalesce(submission.execution_report,''))) >= 10 and jsonb_array_length(coalesce(submission.evidence, '[]'::jsonb)) >= 3 and length(trim(coalesce(submission.customer_signature_name,''))) >= 2 and coalesce(submission.customer_signature_data_url,'') like 'data:image/png;base64,%') then raise exception 'PARTNER_SUBMISSION_REQUIRED'; end if;
    update public.service_orders set status = 'COMPLETED', checked_out_at = clock_timestamp(), completed_at = clock_timestamp(), updated_by = null where id = order_record.id;
    insert into public.service_order_partner_submissions(partner_access_id, organization_id, checked_out_at, checked_out_location, evidence) values(access_record.id, access_record.organization_id, clock_timestamp(), target_location, target_evidence) returning id into submission_id;
    insert into public.service_order_events(service_order_id, organization_id, event_type, actor_id, details) values(order_record.id, order_record.organization_id, 'CHECK_OUT', null, jsonb_build_object('source','PARTNER_ACCESS','submission_id',submission_id));
    insert into public.service_order_events(service_order_id, organization_id, event_type, actor_id, details) values(order_record.id, order_record.organization_id, 'COMPLETED', null, jsonb_build_object('source','PARTNER_ACCESS','submission_id',submission_id));
  end if;
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source) values(order_record.organization_id, null, 'SERVICE_ORDER_PARTNER_EVENT', 'service_order', order_record.id, jsonb_build_object('event',target_event,'submission_id',submission_id), 'PARTNER');
end;
$$;

revoke all on function public.submit_partner_service_order_event(text,text,text,jsonb,text,jsonb,text,text) from public;
grant execute on function public.submit_partner_service_order_event(text,text,text,jsonb,text,jsonb,text,text) to anon;
