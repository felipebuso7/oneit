-- Atomic receipts: a retry with the same actor/key/payload never creates another event.
create table public.field_event_receipts (
  actor_id uuid not null references public.user_profiles(id) on delete restrict,
  action_id uuid not null,
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  payload jsonb not null,
  event_id uuid not null unique references public.ticket_field_events(id) on delete restrict,
  received_at timestamptz not null default clock_timestamp(),
  primary key (actor_id, action_id)
);
alter table public.field_event_receipts enable row level security;
create policy "actors read their event receipts" on public.field_event_receipts for select to authenticated using (actor_id = auth.uid());

create or replace function public.sync_ticket_field_event(
  target_action_id uuid, target_ticket_id uuid, expected_version integer,
  target_event public.field_event_type, target_captured_at timestamptz,
  target_latitude numeric default null, target_longitude numeric default null,
  target_accuracy numeric default null, target_justification text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare receipt public.field_event_receipts%rowtype; ticket public.tickets%rowtype; body jsonb; event_id uuid;
begin
  if auth.uid() is null or not exists (select 1 from public.user_profiles where id = auth.uid() and active) then raise exception 'SYNC_NOT_AUTHORIZED'; end if;
  if target_action_id is null or target_ticket_id is null or expected_version is null or expected_version < 1 or target_event is null or target_captured_at is null then raise exception 'SYNC_INVALID_INPUT'; end if;
  body := jsonb_build_object('ticket', target_ticket_id, 'version', expected_version, 'event', target_event,
    'captured_at', target_captured_at, 'latitude', target_latitude, 'longitude', target_longitude,
    'accuracy', target_accuracy, 'justification', target_justification);
  -- Serialize equal keys even when a modified retry targets a different ticket.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || target_action_id::text, 0));
  select * into receipt from public.field_event_receipts where actor_id = auth.uid() and action_id = target_action_id;
  if receipt.event_id is not null then
    if receipt.payload <> body then raise exception 'SYNC_KEY_REUSED'; end if;
    return receipt.event_id;
  end if;
  if target_captured_at > clock_timestamp() + interval '5 minutes' or target_captured_at < clock_timestamp() - interval '7 days' then raise exception 'SYNC_CAPTURE_TIME_INVALID'; end if;
  select * into ticket from public.tickets where id = target_ticket_id for update;
  if ticket.id is null or not public.is_ticket_assigned_to_current_user(ticket.assigned_technician_id) then raise exception 'SYNC_NOT_AUTHORIZED'; end if;
  if ticket.version <> expected_version then raise exception 'SYNC_VERSION_CONFLICT'; end if;
  event_id := public.record_ticket_field_event(target_ticket_id, target_event, target_latitude,
    target_longitude, target_accuracy, target_justification, target_captured_at);
  insert into public.field_event_receipts(actor_id, action_id, ticket_id, payload, event_id)
    values (auth.uid(), target_action_id, target_ticket_id, body, event_id);
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
    values (ticket.organization_id, auth.uid(), 'FIELD_EVENT_SYNCED', 'ticket', ticket.id,
      jsonb_build_object('action_id', target_action_id, 'event_id', event_id, 'client_captured_at', target_captured_at), 'WEB');
  return event_id;
end;
$$;
revoke all on function public.sync_ticket_field_event(uuid, uuid, integer, public.field_event_type, timestamptz, numeric, numeric, numeric, text) from public;
grant execute on function public.sync_ticket_field_event(uuid, uuid, integer, public.field_event_type, timestamptz, numeric, numeric, numeric, text) to authenticated;
