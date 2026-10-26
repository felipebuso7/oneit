create or replace function public.decide_sgsti_assurance_request(target_request_id uuid,target_decision text,target_comment text default null) returns void language plpgsql security definer set search_path=public as $$
declare request_record public.sgsti_assurance_requests%rowtype; event_id uuid;
begin
 select * into request_record from public.sgsti_assurance_requests where id=target_request_id for update;
 if request_record.id is null or not (public.has_sgsti_role(request_record.organization_id,'AUDITOR') or public.has_organization_role(request_record.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[])) then raise exception 'SGSTI_ASSURANCE_REVIEW_NOT_AUTHORIZED'; end if;
 if request_record.status<>'EVIDENCE_SUBMITTED' or request_record.requested_by=auth.uid() or request_record.responsible_id=auth.uid() then raise exception 'SGSTI_ASSURANCE_REVIEW_SEGREGATION_REQUIRED'; end if;
 if target_decision not in ('ACCEPT','RETURN') or (target_decision='RETURN' and coalesce(length(trim(target_comment)),0)<10) then raise exception 'SGSTI_ASSURANCE_DECISION_INVALID'; end if;
 update public.sgsti_assurance_requests set status=case when target_decision='ACCEPT' then 'ACCEPTED' else 'RETURNED' end,reviewed_by=auth.uid(),reviewed_at=clock_timestamp(),review_comment=nullif(trim(target_comment),'') where id=request_record.id;
 if target_decision='RETURN' then
  insert into public.outbox_events(organization_id,event_type,aggregate_type,aggregate_id,payload,idempotency_key)
  values(request_record.organization_id,'SGSTI_ASSURANCE_NOTIFICATION','SGSTI_ASSURANCE_REQUEST',request_record.id,jsonb_build_object('recipientId',request_record.responsible_id,'notificationType','ASSURANCE_REQUEST','title','Evidência SGSTI devolvida para complemento','body',format('%s. Parecer: %s',request_record.title,trim(target_comment)),'targetPath','/portal/sgsti/assurance'),format('SGSTI_ASSURANCE:%s:RETURN:%s',request_record.id,txid_current())) returning id into event_id;
 end if;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
 values(request_record.organization_id,auth.uid(),case when target_decision='ACCEPT' then 'SGSTI_ASSURANCE_ACCEPTED' else 'SGSTI_ASSURANCE_RETURNED' end,'sgsti_assurance_request',request_record.id,jsonb_build_object('decision',target_decision,'outbox_event_id',event_id),'WEB');
end;
$$;
