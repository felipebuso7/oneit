create or replace function public.schedule_sgsti_assurance_overdues(target_day date default current_date) returns integer language plpgsql security definer set search_path=public as $$
declare inserted_count integer:=0;
begin
 perform public.assert_outbox_worker();
 if target_day not between current_date-30 and current_date+7 then raise exception 'SGSTI_ASSURANCE_SCHEDULE_DATE_OUT_OF_RANGE'; end if;
 update public.sgsti_assurance_requests set status='OVERDUE' where status='OPEN' and due_at<target_day;
 with inserted as (
  insert into public.outbox_events(organization_id,event_type,aggregate_type,aggregate_id,payload,idempotency_key)
  select organization_id,'SGSTI_ASSURANCE_NOTIFICATION','SGSTI_ASSURANCE_REQUEST',id,jsonb_build_object('recipientId',responsible_id,'notificationType','ASSURANCE_REQUEST','title','Pedido de evidência SGSTI em atraso','body',format('%s. O prazo venceu em %s.',title,to_char(due_at,'DD/MM/YYYY')),'targetPath','/portal/sgsti/assurance'),format('SGSTI_ASSURANCE:%s:OVERDUE:%s',id,target_day)
  from public.sgsti_assurance_requests where status='OVERDUE' and due_at<target_day
  on conflict(organization_id,idempotency_key) do nothing returning id
 ) select count(*) into inserted_count from inserted;
 return inserted_count;
end; $$;
revoke all on function public.schedule_sgsti_assurance_overdues(date) from public,authenticated,anon;
grant execute on function public.schedule_sgsti_assurance_overdues(date) to service_role;
