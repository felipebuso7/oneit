-- Harden read access to ticket children. The previous policies only checked that
-- the parent ticket existed, allowing any authenticated user who guessed an ID
-- to read evidence, execution, review and scheduling data.

drop policy if exists "read visible ticket checklist" on public.ticket_checklist_items;
create policy "read visible ticket checklist" on public.ticket_checklist_items
for select to authenticated
using (
  exists (
    select 1 from public.tickets t
    where t.id = ticket_id
      and (public.has_ticket_management_role(t.organization_id)
        or public.is_ticket_assigned_to_current_user(t.assigned_technician_id))
  )
);

drop policy if exists "read visible ticket execution" on public.ticket_execution_records;
create policy "read visible ticket execution" on public.ticket_execution_records
for select to authenticated
using (
  exists (
    select 1 from public.tickets t
    where t.id = ticket_id
      and (public.has_ticket_management_role(t.organization_id)
        or public.is_ticket_assigned_to_current_user(t.assigned_technician_id))
  )
);

drop policy if exists "read visible ticket materials" on public.ticket_materials;
create policy "read visible ticket materials" on public.ticket_materials
for select to authenticated
using (
  exists (
    select 1 from public.tickets t
    where t.id = ticket_id
      and (public.has_ticket_management_role(t.organization_id)
        or public.is_ticket_assigned_to_current_user(t.assigned_technician_id))
  )
);

drop policy if exists "read visible ticket evidences" on public.ticket_evidences;
create policy "read visible ticket evidences" on public.ticket_evidences
for select to authenticated
using (
  exists (
    select 1 from public.tickets t
    where t.id = ticket_id
      and (public.has_ticket_management_role(t.organization_id)
        or public.is_ticket_assigned_to_current_user(t.assigned_technician_id))
  )
);

drop policy if exists "read visible completions" on public.ticket_completions;
create policy "read visible completions" on public.ticket_completions
for select to authenticated
using (
  exists (
    select 1 from public.tickets t
    where t.id = ticket_id
      and (public.has_ticket_management_role(t.organization_id)
        or public.is_ticket_assigned_to_current_user(t.assigned_technician_id))
  )
);

drop policy if exists "read visible reviews" on public.ticket_reviews;
create policy "read visible reviews" on public.ticket_reviews
for select to authenticated
using (
  exists (
    select 1 from public.tickets t
    where t.id = ticket_id
      and (public.has_ticket_management_role(t.organization_id)
        or public.is_ticket_assigned_to_current_user(t.assigned_technician_id))
  )
);

drop policy if exists "read visible ticket reports" on public.ticket_reports;
create policy "read visible ticket reports" on public.ticket_reports
for select to authenticated
using (
  exists (
    select 1 from public.tickets t
    where t.id = ticket_id
      and (public.has_ticket_management_role(t.organization_id)
        or public.is_ticket_assigned_to_current_user(t.assigned_technician_id))
  )
);

drop policy if exists "read visible pending periods" on public.ticket_pending_periods;
create policy "read visible pending periods" on public.ticket_pending_periods
for select to authenticated
using (
  exists (
    select 1 from public.tickets t
    where t.id = ticket_id
      and (public.has_ticket_management_role(t.organization_id)
        or public.is_ticket_assigned_to_current_user(t.assigned_technician_id))
  )
);

drop policy if exists "read visible schedule changes" on public.ticket_schedule_changes;
create policy "read visible schedule changes" on public.ticket_schedule_changes
for select to authenticated
using (
  exists (
    select 1 from public.tickets t
    where t.id = ticket_id
      and (public.has_ticket_management_role(t.organization_id)
        or public.is_ticket_assigned_to_current_user(t.assigned_technician_id))
  )
);

drop policy if exists "read registered evidence objects" on storage.objects;
create policy "read registered evidence objects" on storage.objects
for select to authenticated
using (
  bucket_id = 'ticket-evidences'
  and exists (
    select 1
    from public.ticket_evidences e
    join public.tickets t on t.id = e.ticket_id
    where e.storage_path = name
      and (public.has_ticket_management_role(t.organization_id)
        or public.is_ticket_assigned_to_current_user(t.assigned_technician_id))
  )
);

drop policy if exists "read registered ticket reports" on storage.objects;
create policy "read registered ticket reports" on storage.objects
for select to authenticated
using (
  bucket_id = 'ticket-reports'
  and exists (
    select 1
    from public.ticket_reports r
    join public.tickets t on t.id = r.ticket_id
    where r.storage_path = name
      and (public.has_ticket_management_role(t.organization_id)
        or public.is_ticket_assigned_to_current_user(t.assigned_technician_id))
  )
);
