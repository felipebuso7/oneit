alter table public.service_level_policies add column calendar_id uuid references public.service_calendars(id) on delete restrict;
alter table public.ticket_service_levels add column calendar_id uuid references public.service_calendars(id) on delete restrict;
create or replace function public.validate_service_level_policy_calendar() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.calendar_id is not null and not exists(select 1 from public.service_calendars where id=new.calendar_id and organization_id=new.organization_id and active) then raise exception 'SERVICE_LEVEL_CALENDAR_INVALID'; end if;
  return new;
end; $$;
create trigger service_level_policy_validate_calendar before insert or update of organization_id,calendar_id on public.service_level_policies for each row execute function public.validate_service_level_policy_calendar();
create or replace function public.snapshot_ticket_service_level() returns trigger language plpgsql security definer set search_path=public as $$
declare policy public.service_level_policies%rowtype;
begin
  if new.contract_id is null then return new; end if;
  select * into policy from public.service_level_policies where contract_id=new.contract_id and priority=new.priority and active and (service_offering_id is null or service_offering_id=new.service_offering_id) order by (service_offering_id is not null) desc limit 1;
  if policy.id is null then return new; end if;
  insert into public.ticket_service_levels(ticket_id,policy_id,calendar_id,priority,response_minutes,resolution_minutes,ola_minutes,response_due_at,resolution_due_at,ola_due_at)
  values(new.id,policy.id,policy.calendar_id,new.priority,policy.response_minutes,policy.resolution_minutes,policy.ola_minutes,new.opened_at+make_interval(mins=>policy.response_minutes),new.opened_at+make_interval(mins=>policy.resolution_minutes),new.opened_at+make_interval(mins=>policy.ola_minutes));
  return new;
end; $$;
