alter table public.tickets
  add column first_response_at timestamptz,
  add column first_response_by uuid references public.user_profiles(id) on delete set null;

-- SLA response is reached when the assigned analyst explicitly begins the first attendance, not when a dispatcher merely triages.
create or replace function public.record_ticket_service_level_milestones()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.assigned_technician_id is null and new.assigned_technician_id is not null then
    update public.ticket_service_levels set ola_met_at=coalesce(ola_met_at,clock_timestamp()) where ticket_id=new.id;
  end if;
  return new;
end; $$;

create or replace function public.record_ticket_first_response(target_ticket_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare ticket_record public.tickets%rowtype;
begin
  select * into ticket_record from public.tickets where id=target_ticket_id for update;
  if ticket_record.id is null then raise exception 'TICKET_NOT_FOUND'; end if;
  if ticket_record.assigned_technician_id is null or not public.is_ticket_assigned_to_current_user(ticket_record.assigned_technician_id) then raise exception 'FIRST_RESPONSE_NOT_ASSIGNED_ANALYST'; end if;
  if ticket_record.first_response_at is not null then return; end if;
  update public.tickets set first_response_at=clock_timestamp(),first_response_by=auth.uid() where id=ticket_record.id;
  update public.ticket_service_levels set response_met_at=coalesce(response_met_at,clock_timestamp()) where ticket_id=ticket_record.id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(ticket_record.organization_id,auth.uid(),'TICKET_FIRST_RESPONSE_STARTED','ticket',ticket_record.id,jsonb_build_object('at',clock_timestamp()),'WEB');
end; $$;
revoke all on function public.record_ticket_first_response(uuid) from public;
grant execute on function public.record_ticket_first_response(uuid) to authenticated;
