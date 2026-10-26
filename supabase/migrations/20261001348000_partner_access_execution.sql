create or replace function public.assert_partner_access(target_token text,target_code text)
returns public.service_order_partner_accesses
language plpgsql security definer set search_path=public as $$
declare access_record public.service_order_partner_accesses%rowtype;
begin
  select * into access_record from public.service_order_partner_accesses
  where token_hash=encode(sha256(convert_to(target_token, 'UTF8')),'hex') for update;
  if access_record.id is null then raise exception 'PARTNER_ACCESS_INVALID'; end if;
  if access_record.revoked_at is not null or access_record.expires_at <= clock_timestamp() then raise exception 'PARTNER_ACCESS_EXPIRED'; end if;
  if access_record.validation_count >= 5 then raise exception 'PARTNER_ACCESS_LOCKED'; end if;
  if access_record.access_code_hash <> encode(sha256(convert_to(target_code, 'UTF8')),'hex') then
    update public.service_order_partner_accesses set validation_count=validation_count+1 where id=access_record.id;
    raise exception 'PARTNER_ACCESS_INVALID';
  end if;
  update public.service_order_partner_accesses set last_validated_at=clock_timestamp() where id=access_record.id;
  return access_record;
end; $$;

create or replace function public.get_partner_service_order_context(target_token text,target_code text)
returns table(service_order_id uuid,order_number text,ticket_number text,title text,scheduled_at timestamptz,status text,location_name text,location_address text)
language plpgsql security definer set search_path=public as $$
declare access_record public.service_order_partner_accesses%rowtype;
begin
  access_record:=public.assert_partner_access(target_token,target_code);
  return query select so.id,so.order_number,t.ticket_number,t.title,so.scheduled_at,so.status,loc.name,
    concat_ws(', ',loc.street,loc.street_number,loc.complement,loc.district,loc.city,loc.state_code)
  from public.service_orders so join public.tickets t on t.id=so.ticket_id join public.customer_locations loc on loc.id=so.location_id
  where so.id=access_record.service_order_id;
end; $$;

create or replace function public.submit_partner_service_order_event(target_token text,target_code text,target_event text,target_location jsonb default null,target_report text default null)
returns void language plpgsql security definer set search_path=public as $$
declare access_record public.service_order_partner_accesses%rowtype; order_record public.service_orders%rowtype; submission_id uuid;
begin
  access_record:=public.assert_partner_access(target_token,target_code);
  select * into order_record from public.service_orders where id=access_record.service_order_id for update;
  if target_event not in('CHECK_IN','CHECK_OUT','SUBMIT') then raise exception 'PARTNER_EVENT_INVALID'; end if;
  if target_location is not null and jsonb_typeof(target_location)<>'object' then raise exception 'PARTNER_LOCATION_INVALID'; end if;
  if target_event='CHECK_IN' then
    if order_record.status not in('DISPATCHED','TRAVELING') then raise exception 'PARTNER_EVENT_INVALID_STATE'; end if;
    update public.service_orders set status='CHECKED_IN',checked_in_at=clock_timestamp(),updated_by=null where id=order_record.id;
    insert into public.service_order_partner_submissions(partner_access_id,organization_id,checked_in_at,checked_in_location) values(access_record.id,access_record.organization_id,clock_timestamp(),target_location) returning id into submission_id;
  elsif target_event='CHECK_OUT' then
    if order_record.status not in('CHECKED_IN','IN_SERVICE') then raise exception 'PARTNER_EVENT_INVALID_STATE'; end if;
    update public.service_orders set status='COMPLETED',checked_out_at=clock_timestamp(),completed_at=clock_timestamp(),updated_by=null where id=order_record.id;
    insert into public.service_order_partner_submissions(partner_access_id,organization_id,checked_out_at,checked_out_location) values(access_record.id,access_record.organization_id,clock_timestamp(),target_location) returning id into submission_id;
  else
    if length(trim(coalesce(target_report,''))) not between 10 and 10000 then raise exception 'PARTNER_REPORT_INVALID'; end if;
    insert into public.service_order_partner_submissions(partner_access_id,organization_id,execution_report,submitted_at) values(access_record.id,access_record.organization_id,trim(target_report),clock_timestamp()) returning id into submission_id;
  end if;
  insert into public.service_order_events(service_order_id,organization_id,event_type,actor_id,details) values(order_record.id,order_record.organization_id,case when target_event='CHECK_IN' then 'CHECK_IN' when target_event='CHECK_OUT' then 'CHECK_OUT' else 'COMPLETED' end,null,jsonb_build_object('source','PARTNER_ACCESS','submission_id',submission_id));
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(order_record.organization_id,null,'SERVICE_ORDER_PARTNER_EVENT','service_order',order_record.id,jsonb_build_object('event',target_event,'submission_id',submission_id),'PARTNER');
end; $$;

revoke all on function public.assert_partner_access(text,text) from public;
revoke all on function public.get_partner_service_order_context(text,text),public.submit_partner_service_order_event(text,text,text,jsonb,text) from public;
grant execute on function public.get_partner_service_order_context(text,text),public.submit_partner_service_order_event(text,text,text,jsonb,text) to anon;
