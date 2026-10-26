-- Completa a sequência operacional do técnico externo:
-- check-in -> registro do atendimento -> checkout.
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
  elsif target_event='SUBMIT' then
    if order_record.status not in('CHECKED_IN','IN_SERVICE') then raise exception 'PARTNER_EVENT_INVALID_STATE'; end if;
    if length(trim(coalesce(target_report,''))) not between 10 and 10000 then raise exception 'PARTNER_REPORT_INVALID'; end if;
    update public.service_orders set status='IN_SERVICE',updated_by=null where id=order_record.id;
    insert into public.service_order_partner_submissions(partner_access_id,organization_id,execution_report,submitted_at) values(access_record.id,access_record.organization_id,trim(target_report),clock_timestamp()) returning id into submission_id;
  else
    if order_record.status not in('IN_SERVICE','CHECKED_IN') then raise exception 'PARTNER_EVENT_INVALID_STATE'; end if;
    update public.service_orders set status='COMPLETED',checked_out_at=clock_timestamp(),completed_at=clock_timestamp(),updated_by=null where id=order_record.id;
    insert into public.service_order_partner_submissions(partner_access_id,organization_id,checked_out_at,checked_out_location) values(access_record.id,access_record.organization_id,clock_timestamp(),target_location) returning id into submission_id;
  end if;
  insert into public.service_order_events(service_order_id,organization_id,event_type,actor_id,details) values(order_record.id,order_record.organization_id,case when target_event='CHECK_IN' then 'CHECK_IN' when target_event='CHECK_OUT' then 'CHECK_OUT' else 'COMPLETED' end,null,jsonb_build_object('source','PARTNER_ACCESS','submission_id',submission_id));
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(order_record.organization_id,null,'SERVICE_ORDER_PARTNER_EVENT','service_order',order_record.id,jsonb_build_object('event',target_event,'submission_id',submission_id),'PARTNER');
end; $$;

revoke all on function public.submit_partner_service_order_event(text,text,text,jsonb,text) from public;
grant execute on function public.submit_partner_service_order_event(text,text,text,jsonb,text) to anon;
