-- Close gaps found during field-flow review. Apply after the existing migrations.
create extension if not exists btree_gist;

-- The existing invoker RPC must have an INSERT policy to create schedules.
create policy "management inserts schedules" on public.ticket_schedules
for insert to authenticated with check (
  dispatcher_id = auth.uid()
  and exists (
    select 1 from public.tickets t join public.technicians tech on tech.id = technician_id
    where t.id = ticket_id and tech.organization_id = t.organization_id and tech.active
      and public.has_ticket_management_role(t.organization_id)
  )
);

-- Enforce concurrency safety in the database, even for two simultaneous requests.
alter table public.ticket_schedules add constraint schedules_no_overlap
exclude using gist (technician_id with =, tstzrange(planned_start, planned_end, '[)') with &&)
where (status = 'SCHEDULED');
create unique index schedules_one_active_per_ticket on public.ticket_schedules(ticket_id) where status = 'SCHEDULED';

alter table public.ticket_field_events add constraint field_event_valid_coordinates check (
  (latitude is null and longitude is null and accuracy_meters is null and length(trim(location_justification)) >= 10)
  or (latitude is not null and longitude is not null and accuracy_meters is not null
      and latitude between -90 and 90 and longitude between -180 and 180
      and accuracy_meters between 0 and 100000)
);

-- A PostgreSQL CHECK permits NULL; explicitly prevent a missing justification.
alter table public.ticket_field_events add constraint field_event_missing_gps_reason check (
  latitude is not null or coalesce(length(trim(location_justification)), 0) >= 10
);

create or replace function public.is_ticket_assigned_to_current_user(target_technician_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.technicians tech
    join public.user_profiles profile on profile.id = tech.user_id
    where tech.id = target_technician_id and tech.user_id = auth.uid() and tech.active and profile.active
      and public.has_organization_role(tech.organization_id, array['TECHNICIAN']::public.platform_role[])
  );
$$;
