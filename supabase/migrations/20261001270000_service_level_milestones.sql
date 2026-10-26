alter table public.ticket_service_levels
  add column response_met_at timestamptz,
  add column ola_met_at timestamptz;

create or replace function public.record_ticket_service_level_milestones()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.operational_status = 'NEW' and new.operational_status <> 'NEW' then
    update public.ticket_service_levels
    set response_met_at = coalesce(response_met_at, clock_timestamp())
    where ticket_id = new.id;
  end if;

  if old.assigned_technician_id is null and new.assigned_technician_id is not null then
    update public.ticket_service_levels
    set ola_met_at = coalesce(ola_met_at, clock_timestamp())
    where ticket_id = new.id;
  end if;
  return new;
end;
$$;

create trigger tickets_record_service_level_milestones
after update of operational_status, assigned_technician_id on public.tickets
for each row execute function public.record_ticket_service_level_milestones();
