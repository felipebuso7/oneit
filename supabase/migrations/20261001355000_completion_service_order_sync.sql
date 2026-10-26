-- Synchronize field check-out and service-order closure with technical ticket closure.
create or replace function public.complete_ticket(
  p_ticket_id uuid,
  p_expected_version integer,
  p_resolved_at timestamptz,
  p_resolution_summary text,
  p_resolution_code text,
  p_workaround text default null,
  p_root_cause text default null,
  p_closure_notes text default null,
  p_customer_confirmation_required boolean default false,
  p_customer_confirmed_at timestamptz default null,
  p_materials jsonb default '[]'::jsonb,
  p_follow_up_required boolean default false,
  p_follow_up_at timestamptz default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ticket public.tickets%rowtype;
  v_execution public.ticket_executions%rowtype;
  v_order public.service_orders%rowtype;
  v_completion_id uuid;
  v_materials_count integer;
  v_has_order boolean := false;
begin
  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found then raise exception 'TICKET_NOT_FOUND'; end if;
  if v_ticket.assigned_technician_id is distinct from auth.uid() then raise exception 'TICKET_NOT_ASSIGNED_TO_TECHNICIAN'; end if;
  if v_ticket.version <> p_expected_version then raise exception 'TICKET_VERSION_CONFLICT'; end if;
  if v_ticket.status <> 'IN_PROGRESS' then raise exception 'TICKET_NOT_READY_FOR_COMPLETION'; end if;

  select * into v_execution from public.ticket_executions where ticket_id = v_ticket.id for update;
  if not found or v_execution.work_started_at is null then raise exception 'TICKET_WORK_NOT_STARTED'; end if;
  if p_resolved_at is null or p_resolved_at < v_execution.work_started_at then raise exception 'INVALID_RESOLUTION_TIMESTAMP'; end if;
  if coalesce(trim(p_resolution_summary), '') = '' then raise exception 'RESOLUTION_SUMMARY_REQUIRED'; end if;
  if p_customer_confirmation_required and p_customer_confirmed_at is null then raise exception 'CUSTOMER_CONFIRMATION_REQUIRED'; end if;
  if p_follow_up_required and p_follow_up_at is null then raise exception 'FOLLOW_UP_TIMESTAMP_REQUIRED'; end if;
  if jsonb_typeof(coalesce(p_materials, '[]'::jsonb)) <> 'array' then raise exception 'INVALID_MATERIALS_PAYLOAD'; end if;

  select count(*) into v_materials_count from jsonb_array_elements(coalesce(p_materials, '[]'::jsonb));
  insert into public.ticket_completions (
    ticket_id,resolved_at,resolution_summary,resolution_code,workaround,root_cause,closure_notes,
    customer_confirmation_required,customer_confirmed_at,materials,materials_count,
    follow_up_required,follow_up_at,completed_by
  ) values (
    v_ticket.id,p_resolved_at,trim(p_resolution_summary),nullif(trim(p_resolution_code),''),
    nullif(trim(p_workaround),''),nullif(trim(p_root_cause),''),nullif(trim(p_closure_notes),''),
    p_customer_confirmation_required,p_customer_confirmed_at,coalesce(p_materials,'[]'::jsonb),
    v_materials_count,p_follow_up_required,p_follow_up_at,auth.uid()
  ) returning id into v_completion_id;

  -- Orders are optional, preserving the standard ITSM closure path for remote work.
  select * into v_order from public.service_orders where ticket_id = v_ticket.id for update;
  v_has_order := found;
  if v_has_order then
    if v_order.technician_id is distinct from v_ticket.assigned_technician_id
       or v_order.status not in ('CHECKED_IN','IN_SERVICE') then
      raise exception 'SERVICE_ORDER_NOT_READY_FOR_COMPLETION';
    end if;

    update public.service_orders
       set status = 'COMPLETED',
           checked_out_at = clock_timestamp(),
           completed_at = clock_timestamp(),
           updated_by = auth.uid()
     where id = v_order.id;

    update public.field_service_route_stops
       set checked_out_at = clock_timestamp()
     where service_order_id = v_order.id and checked_out_at is null;

    insert into public.service_order_events(service_order_id,event_type,occurred_at,actor_id,payload)
    values
      (v_order.id,'CHECK_OUT',clock_timestamp(),auth.uid(),jsonb_build_object('source','ticket_completion','ticket_id',v_ticket.id)),
      (v_order.id,'COMPLETED',p_resolved_at,auth.uid(),jsonb_build_object('completion_id',v_completion_id,'ticket_id',v_ticket.id));
  end if;

  update public.ticket_executions
     set work_ended_at = p_resolved_at, updated_at = clock_timestamp()
   where ticket_id = v_ticket.id;

  update public.tickets
     set status = case when p_customer_confirmation_required then 'RESOLVED' else 'CLOSED' end,
         resolved_at = p_resolved_at,
         closed_at = case when p_customer_confirmation_required then null else p_resolved_at end,
         version = version + 1,
         updated_at = clock_timestamp()
   where id = v_ticket.id;

  insert into public.ticket_status_history(ticket_id,from_status,to_status,changed_by,changed_at,reason)
  values (
    v_ticket.id,v_ticket.status,
    case when p_customer_confirmation_required then 'RESOLVED' else 'CLOSED' end,
    auth.uid(),p_resolved_at,'Conclusão técnica registrada'
  );

  perform public.log_audit_event(
    v_ticket.organization_id,'ticket.completed','ticket',v_ticket.id,
    jsonb_build_object('completion_id',v_completion_id,'service_order_id',case when v_has_order then v_order.id else null end,'materials_count',v_materials_count,'follow_up_required',p_follow_up_required)
  );
  return v_completion_id;
end;
$$;
