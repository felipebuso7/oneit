-- Corrige referências ambíguas e funções de extensão em funções já existentes.
-- Nenhuma tabela ou registro é removido; as assinaturas públicas permanecem iguais.

create or replace function public.dispatch_ticket_to_field(
  target_ticket_id uuid, target_technician_id uuid, target_location_id uuid,
  target_planned_start_at timestamptz, target_planned_end_at timestamptz,
  target_local_contact_name text default null, target_local_contact_phone text default null
)
returns table(service_order_id uuid, order_number text, route_stop_id uuid)
language plpgsql security definer set search_path = public as $$
declare ticket_record public.tickets%rowtype; existing_order public.service_orders%rowtype;
  created_route_id uuid; created_order_id uuid; created_stop_id uuid; next_sequence_number smallint;
begin
  if target_planned_end_at <= target_planned_start_at then raise exception 'FIELD_DISPATCH_INVALID_WINDOW'; end if;
  select * into ticket_record from public.tickets where id=target_ticket_id for update;
  if ticket_record.id is null or not public.has_organization_role(ticket_record.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]) then raise exception 'FIELD_DISPATCH_NOT_AUTHORIZED'; end if;
  if ticket_record.operational_status not in ('NEW','TRIAGE','AWAITING_SCHEDULING','SCHEDULED','ASSIGNED') then raise exception 'FIELD_DISPATCH_INVALID_TICKET_STATE'; end if;
  if not exists(select 1 from public.technicians where id=target_technician_id and organization_id=ticket_record.organization_id and active) then raise exception 'FIELD_DISPATCH_INVALID_TECHNICIAN'; end if;
  if not exists(select 1 from public.customer_locations where id=target_location_id and organization_id=ticket_record.organization_id and active) then raise exception 'FIELD_DISPATCH_INVALID_LOCATION'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_technician_id::text || target_planned_start_at::date::text,0));
  if exists(select 1 from public.field_service_route_stops route_stop join public.field_service_routes route on route.id=route_stop.route_id join public.service_orders so on so.id=route_stop.service_order_id where route.technician_id=target_technician_id and route.route_date=target_planned_start_at::date and so.status in ('DISPATCHED','TRAVELING','CHECKED_IN','IN_SERVICE') and coalesce(route_stop.planned_start_at,so.scheduled_at)<target_planned_end_at and coalesce(route_stop.planned_end_at,so.scheduled_at+interval '1 hour')>target_planned_start_at) then raise exception 'FIELD_DISPATCH_SCHEDULE_CONFLICT'; end if;
  select * into existing_order from public.service_orders where ticket_id=target_ticket_id for update;
  if existing_order.id is not null then raise exception 'FIELD_DISPATCH_ORDER_ALREADY_EXISTS'; end if;
  insert into public.service_orders(organization_id,ticket_id,contract_id,location_id,technician_id,scheduled_at,status,dispatched_at,local_contact_name,local_contact_phone,created_by,updated_by) values(ticket_record.organization_id,ticket_record.id,ticket_record.contract_id,target_location_id,target_technician_id,target_planned_start_at,'DISPATCHED',clock_timestamp(),nullif(trim(target_local_contact_name),''),nullif(trim(target_local_contact_phone),''),auth.uid(),auth.uid()) returning id into created_order_id;
  insert into public.field_service_routes(organization_id,technician_id,route_date,start_location,end_location,created_by,updated_by) values(ticket_record.organization_id,target_technician_id,target_planned_start_at::date,'{}'::jsonb,'{}'::jsonb,auth.uid(),auth.uid()) on conflict(organization_id,technician_id,route_date) do update set updated_by=auth.uid() returning id into created_route_id;
  select coalesce(max(route_stop.sequence_number),0)::smallint+1 into next_sequence_number from public.field_service_route_stops route_stop where route_stop.route_id=created_route_id;
  insert into public.field_service_route_stops(route_id,organization_id,service_order_id,sequence_number,planned_start_at,planned_end_at) values(created_route_id,ticket_record.organization_id,created_order_id,next_sequence_number,target_planned_start_at,target_planned_end_at) returning id into created_stop_id;
  update public.tickets set assigned_technician_id=target_technician_id,scheduled_at=target_planned_start_at,operational_status='ASSIGNED',version=version+1 where id=ticket_record.id;
  insert into public.service_order_events(service_order_id,organization_id,event_type,actor_id,details) values(created_order_id,ticket_record.organization_id,'CREATED',auth.uid(),jsonb_build_object('ticket_id',ticket_record.id,'location_id',target_location_id)),(created_order_id,ticket_record.organization_id,'DISPATCHED',auth.uid(),jsonb_build_object('technician_id',target_technician_id,'scheduled_at',target_planned_start_at,'route_id',created_route_id,'route_stop_id',created_stop_id));
  insert into public.ticket_status_history(ticket_id,organization_id,dimension,previous_status,next_status,actor_id,reason) values(ticket_record.id,ticket_record.organization_id,'OPERATIONAL',ticket_record.operational_status::text,'ASSIGNED',auth.uid(),'Despacho pela OS de Field Service');
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(ticket_record.organization_id,auth.uid(),'FIELD_DISPATCHED_ATOMIC','service_order',created_order_id,jsonb_build_object('ticket_id',ticket_record.id,'technician_id',target_technician_id,'location_id',target_location_id,'route_stop_id',created_stop_id),'WEB');
  return query select so.id,so.order_number,created_stop_id from public.service_orders so where so.id=created_order_id;
end; $$;

create or replace function public.create_service_order_partner_access(target_service_order_id uuid,target_supplier_id uuid default null,target_valid_for_minutes integer default 480)
returns table(access_id uuid,access_token text,access_code text)
language plpgsql security definer set search_path=public as $$
declare order_record public.service_orders%rowtype; raw_token text; raw_code text;
begin
  select * into order_record from public.service_orders where id=target_service_order_id for update;
  if order_record.id is null or not public.has_organization_role(order_record.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]) then raise exception 'PARTNER_ACCESS_NOT_AUTHORIZED'; end if;
  if order_record.status in('COMPLETED','VALIDATED','CANCELLED') then raise exception 'PARTNER_ACCESS_INVALID_ORDER_STATE'; end if;
  if target_valid_for_minutes not between 15 and 10080 then raise exception 'PARTNER_ACCESS_INVALID_EXPIRY'; end if;
  update public.service_order_partner_accesses set revoked_at=clock_timestamp() where service_order_id=order_record.id and revoked_at is null and expires_at>clock_timestamp();
  raw_token:=encode(extensions.gen_random_bytes(24),'hex'); raw_code:=lpad((floor(random()*1000000))::text,6,'0');
  insert into public.service_order_partner_accesses(organization_id,service_order_id,supplier_id,token_hash,access_code_hash,expires_at,created_by) values(order_record.organization_id,order_record.id,target_supplier_id,encode(sha256(convert_to(raw_token,'UTF8')),'hex'),encode(sha256(convert_to(raw_code,'UTF8')),'hex'),clock_timestamp()+make_interval(mins=>target_valid_for_minutes),auth.uid()) returning id into access_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(order_record.organization_id,auth.uid(),'SERVICE_ORDER_PARTNER_ACCESS_CREATED','service_order_partner_access',access_id,jsonb_build_object('service_order_id',order_record.id,'expires_in_minutes',target_valid_for_minutes),'WEB');
  access_token:=raw_token; access_code:=raw_code; return next;
end; $$;

create or replace function public.claim_outbox_events(target_limit integer default 20,target_lock_seconds integer default 300)
returns table(id uuid,organization_id uuid,event_type text,aggregate_type text,aggregate_id uuid,payload jsonb,attempts integer,correlation_id uuid)
language plpgsql security definer set search_path=public as $$
begin
  perform public.assert_outbox_worker();
  if target_limit not between 1 and 100 or target_lock_seconds not between 30 and 3600 then raise exception 'OUTBOX_INVALID_CLAIM_OPTIONS'; end if;
  return query with candidates as(select event.id from public.outbox_events event where event.available_at<=now() and event.status in('PENDING','PROCESSING') order by event.created_at for update skip locked limit target_limit),claimed as(update public.outbox_events event set status='PROCESSING',attempts=event.attempts+1,available_at=now()+make_interval(secs=>target_lock_seconds),last_error=null from candidates where event.id=candidates.id returning event.*),recorded as(insert into public.outbox_event_attempts(outbox_event_id,attempt_number,outcome) select claimed.id,claimed.attempts,'STARTED' from claimed) select claimed.id,claimed.organization_id,claimed.event_type,claimed.aggregate_type,claimed.aggregate_id,claimed.payload,claimed.attempts,claimed.correlation_id from claimed;
end; $$;

create or replace function public.claim_sgsti_reminder_events(target_limit integer default 20,target_lock_seconds integer default 300)
returns table(id uuid,organization_id uuid,event_type text,aggregate_type text,aggregate_id uuid,payload jsonb,attempts integer,correlation_id uuid)
language plpgsql security definer set search_path=public as $$
begin
  perform public.assert_outbox_worker();
  if target_limit not between 1 and 100 or target_lock_seconds not between 30 and 3600 then raise exception 'OUTBOX_INVALID_CLAIM_OPTIONS'; end if;
  return query with candidates as(select event.id from public.outbox_events event where event.available_at<=now() and event.status in('PENDING','PROCESSING') and event.event_type='SGSTI_REMINDER' order by event.created_at for update skip locked limit target_limit),claimed as(update public.outbox_events event set status='PROCESSING',attempts=event.attempts+1,available_at=now()+make_interval(secs=>target_lock_seconds),last_error=null from candidates where event.id=candidates.id returning event.*),recorded as(insert into public.outbox_event_attempts(outbox_event_id,attempt_number,outcome) select claimed.id,claimed.attempts,'STARTED' from claimed) select claimed.id,claimed.organization_id,claimed.event_type,claimed.aggregate_type,claimed.aggregate_id,claimed.payload,claimed.attempts,claimed.correlation_id from claimed;
end; $$;

create or replace function public.claim_sgsti_notification_events(target_limit integer default 20,target_lock_seconds integer default 300)
returns table(id uuid,organization_id uuid,event_type text,aggregate_type text,aggregate_id uuid,payload jsonb,attempts integer,correlation_id uuid)
language plpgsql security definer set search_path=public as $$
begin
  perform public.assert_outbox_worker();
  if target_limit not between 1 and 100 or target_lock_seconds not between 30 and 3600 then raise exception 'OUTBOX_INVALID_CLAIM_OPTIONS'; end if;
  return query with candidates as(select event.id from public.outbox_events event where event.available_at<=now() and event.status in('PENDING','PROCESSING') and event.event_type in('SGSTI_REMINDER','SGSTI_ASSURANCE_NOTIFICATION') order by event.created_at for update skip locked limit target_limit),claimed as(update public.outbox_events event set status='PROCESSING',attempts=event.attempts+1,available_at=now()+make_interval(secs=>target_lock_seconds),last_error=null from candidates where event.id=candidates.id returning event.*),recorded as(insert into public.outbox_event_attempts(outbox_event_id,attempt_number,outcome) select claimed.id,claimed.attempts,'STARTED' from claimed) select claimed.id,claimed.organization_id,claimed.event_type,claimed.aggregate_type,claimed.aggregate_id,claimed.payload,claimed.attempts,claimed.correlation_id from claimed;
end; $$;

create or replace function public.review_sgsti_activity(target_occurrence_id uuid,target_comment text)
returns void language plpgsql security definer set search_path=public as $$
declare occurrence public.sgsti_activity_occurrences%rowtype;
begin
  select * into occurrence from public.sgsti_activity_occurrences where id=target_occurrence_id for update;
  if occurrence.id is null or not (public.has_sgsti_role(occurrence.organization_id,array['REVIEWER']::public.sgsti_role[]) or public.has_organization_role(occurrence.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[])) then raise exception 'SGSTI_REVIEW_NOT_AUTHORIZED'; end if;
  if occurrence.approval_status<>'PENDING_REVIEW' then raise exception 'SGSTI_REVIEW_INVALID_STATE'; end if;
  if occurrence.submitted_by=auth.uid() then raise exception 'SGSTI_SELF_REVIEW_FORBIDDEN'; end if;
  if coalesce(length(trim(target_comment)),0)<10 then raise exception 'SGSTI_REVIEW_COMMENT_REQUIRED'; end if;
  update public.sgsti_activity_occurrences set approval_status='PENDING_APPROVAL',reviewed_by=auth.uid(),reviewed_at=clock_timestamp(),reviewer_comment=trim(target_comment),approval_comment=null where id=occurrence.id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(occurrence.organization_id,auth.uid(),'SGSTI_ACTIVITY_REVIEWED','sgsti_activity_occurrence',occurrence.id,jsonb_build_object('status','PENDING_APPROVAL'),'WEB');
end; $$;

create or replace function public.create_sgsti_assurance_request(target_organization_id uuid,target_control_id uuid,target_title text,target_requirement text,target_note text,target_responsible_id uuid,target_due_at date)
returns uuid language plpgsql security definer set search_path=public as $$
declare request_id uuid;
begin
  if not (public.has_sgsti_role(target_organization_id,array['AUDITOR']::public.sgsti_role[]) or public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[])) then raise exception 'SGSTI_ASSURANCE_NOT_AUTHORIZED'; end if;
  if coalesce(length(trim(target_title)),0) not between 5 and 240 or coalesce(length(trim(target_note)),0) not between 10 and 10000 or target_due_at<current_date-1 then raise exception 'SGSTI_ASSURANCE_INVALID_INPUT'; end if;
  insert into public.sgsti_assurance_requests(organization_id,control_id,title,requirement_reference,request_note,responsible_id,due_at,requested_by) values(target_organization_id,target_control_id,trim(target_title),nullif(trim(target_requirement),''),trim(target_note),target_responsible_id,target_due_at,auth.uid()) returning id into request_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(target_organization_id,auth.uid(),'SGSTI_ASSURANCE_REQUEST_CREATED','sgsti_assurance_request',request_id,jsonb_build_object('responsible_id',target_responsible_id,'due_at',target_due_at),'WEB');
  return request_id;
end; $$;

create or replace function public.decide_sgsti_assurance_request(target_request_id uuid,target_decision text,target_comment text default null)
returns void language plpgsql security definer set search_path=public as $$
declare request_record public.sgsti_assurance_requests%rowtype;
begin
  select * into request_record from public.sgsti_assurance_requests where id=target_request_id for update;
  if request_record.id is null or not (public.has_sgsti_role(request_record.organization_id,array['AUDITOR']::public.sgsti_role[]) or public.has_organization_role(request_record.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[])) then raise exception 'SGSTI_ASSURANCE_REVIEW_NOT_AUTHORIZED'; end if;
  if request_record.status<>'EVIDENCE_SUBMITTED' or request_record.requested_by=auth.uid() or request_record.responsible_id=auth.uid() then raise exception 'SGSTI_ASSURANCE_REVIEW_SEGREGATION_REQUIRED'; end if;
  if target_decision not in ('ACCEPT','RETURN') or (target_decision='RETURN' and coalesce(length(trim(target_comment)),0)<10) then raise exception 'SGSTI_ASSURANCE_DECISION_INVALID'; end if;
  update public.sgsti_assurance_requests set status=case when target_decision='ACCEPT' then 'ACCEPTED' else 'RETURNED' end,reviewed_by=auth.uid(),reviewed_at=clock_timestamp(),review_comment=nullif(trim(target_comment),'') where id=request_record.id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(request_record.organization_id,auth.uid(),case when target_decision='ACCEPT' then 'SGSTI_ASSURANCE_ACCEPTED' else 'SGSTI_ASSURANCE_RETURNED' end,'sgsti_assurance_request',request_record.id,jsonb_build_object('decision',target_decision),'WEB');
end; $$;

-- A approval request já identifica o change pelo entity_id; a tabela changes não possui entity_type.
create or replace function public.decide_change_approval(target_approval_id uuid,target_decision public.approval_decision,target_comment text default null)
returns void language plpgsql security definer set search_path=public as $$
declare a public.approval_requests%rowtype;
begin
  select * into a from public.approval_requests where id=target_approval_id for update;
  if a.id is null or a.approver_id<>auth.uid() or a.decision<>'PENDING' then raise exception 'APPROVAL_DECISION_NOT_AUTHORIZED'; end if;
  if target_decision not in('APPROVED','REJECTED') then raise exception 'APPROVAL_INVALID_DECISION'; end if;
  if target_decision='REJECTED' and length(trim(target_comment)) not between 10 and 2000 then raise exception 'APPROVAL_REJECTION_COMMENT_REQUIRED'; end if;
  update public.approval_requests set decision=target_decision,comment=nullif(trim(target_comment),''),decided_at=clock_timestamp() where id=a.id;
  update public.changes set status=case when target_decision='APPROVED' then 'APPROVED' else 'ASSESSMENT' end where id=a.entity_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(a.organization_id,auth.uid(),'CHANGE_APPROVAL_DECIDED','change',a.entity_id,jsonb_build_object('approval_id',a.id,'decision',target_decision),'WEB');
end; $$;
