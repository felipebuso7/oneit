create table public.execution_sync_receipts (
  actor_id uuid not null references public.user_profiles(id) on delete restrict,
  action_id uuid not null,
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  payload jsonb not null,
  record_id uuid not null unique references public.ticket_execution_records(id) on delete restrict,
  received_at timestamptz not null default clock_timestamp(),
  primary key (actor_id, action_id)
);
alter table public.execution_sync_receipts enable row level security;
create policy "actors read their execution receipts" on public.execution_sync_receipts for select to authenticated using (actor_id = auth.uid());

create or replace function public.sync_ticket_execution(
  target_action_id uuid, target_ticket_id uuid, expected_version integer,
  target_fault_domain public.fault_domain, target_diagnosis text, target_solution text,
  target_answers jsonb, target_items jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare receipt public.execution_sync_receipts%rowtype; ticket public.tickets%rowtype; body jsonb; actual_items jsonb; submitted_items jsonb; record_id uuid;
begin
  if auth.uid() is null or not exists (select 1 from public.user_profiles where id = auth.uid() and active) then raise exception 'EXECUTION_SYNC_NOT_AUTHORIZED'; end if;
  if target_action_id is null or target_ticket_id is null or expected_version is null or expected_version < 1 or target_fault_domain is null
    or target_diagnosis is null or length(trim(target_diagnosis)) not between 10 and 10000
    or target_solution is null or length(trim(target_solution)) not between 10 and 10000
    or target_answers is null or jsonb_typeof(target_answers) <> 'object'
    or target_items is null or jsonb_typeof(target_items) <> 'array' then raise exception 'EXECUTION_SYNC_INVALID_INPUT'; end if;
  if jsonb_array_length(target_items) > 100 then raise exception 'EXECUTION_SYNC_INVALID_INPUT'; end if;
  select coalesce(jsonb_agg(value order by (value ->> 'item_code') collate "C"), '[]'::jsonb)
    into submitted_items from jsonb_array_elements(target_items);
  body := jsonb_build_object('ticket', target_ticket_id, 'version', expected_version, 'domain', target_fault_domain,
    'diagnosis', target_diagnosis, 'solution', target_solution, 'answers', target_answers, 'items', submitted_items);
  perform pg_advisory_xact_lock(hashtextextended('execution:' || auth.uid()::text || ':' || target_action_id::text, 0));
  select * into receipt from public.execution_sync_receipts where actor_id = auth.uid() and action_id = target_action_id;
  if receipt.record_id is not null then
    if receipt.payload <> body then raise exception 'EXECUTION_SYNC_KEY_REUSED'; end if;
    return receipt.record_id;
  end if;
  select * into ticket from public.tickets where id = target_ticket_id for update;
  if ticket.id is null or not public.is_ticket_assigned_to_current_user(ticket.assigned_technician_id) then raise exception 'EXECUTION_SYNC_NOT_AUTHORIZED'; end if;
  if ticket.version <> expected_version then raise exception 'EXECUTION_VERSION_CONFLICT'; end if;
  if ticket.operational_status not in ('WORK_STARTED', 'IN_PROGRESS') then raise exception 'EXECUTION_INVALID_STATE'; end if;

  -- Materialize the snapshot in a single statement before comparing labels/requirements.
  -- A mismatch rolls this back; the delegated save cannot re-read a changed template.
  if not exists (select 1 from public.ticket_checklist_items where ticket_id = ticket.id) then
    insert into public.ticket_checklist_items(ticket_id, item_code, label, position, required)
    select ticket.id, item_code, label, position, required from public.checklist_templates
    where organization_id = ticket.organization_id
      or (organization_id is null and not exists (select 1 from public.checklist_templates where organization_id = ticket.organization_id));
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('item_code', item_code, 'label', label, 'required', required) order by item_code collate "C"), '[]'::jsonb)
    into actual_items from public.ticket_checklist_items where ticket_id = ticket.id;
  if actual_items = '[]'::jsonb or actual_items <> submitted_items then raise exception 'EXECUTION_CHECKLIST_CONFLICT'; end if;
  record_id := public.save_ticket_execution(ticket.id, expected_version, target_fault_domain, target_diagnosis, target_solution, target_answers);
  insert into public.execution_sync_receipts(actor_id, action_id, ticket_id, payload, record_id)
    values (auth.uid(), target_action_id, ticket.id, body, record_id);
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
    values (ticket.organization_id, auth.uid(), 'EXECUTION_SYNCED', 'ticket', ticket.id,
      jsonb_build_object('action_id', target_action_id, 'record_id', record_id), 'WEB');
  return record_id;
end;
$$;
revoke all on function public.sync_ticket_execution(uuid, uuid, integer, public.fault_domain, text, text, jsonb, jsonb) from public;
grant execute on function public.sync_ticket_execution(uuid, uuid, integer, public.fault_domain, text, text, jsonb, jsonb) to authenticated;
