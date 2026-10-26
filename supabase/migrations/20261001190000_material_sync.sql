create table public.material_sync_receipts (
  actor_id uuid not null references public.user_profiles(id) on delete restrict,
  action_id uuid not null, ticket_id uuid not null references public.tickets(id) on delete restrict,
  payload jsonb not null, material_record_id uuid not null unique references public.ticket_materials(id) on delete restrict,
  received_at timestamptz not null default clock_timestamp(), primary key (actor_id, action_id)
);
alter table public.material_sync_receipts enable row level security;
create policy "actors read their material receipts" on public.material_sync_receipts for select to authenticated using (actor_id = auth.uid());
create or replace function public.sync_ticket_material(target_action_id uuid, target_ticket_id uuid, expected_version integer, target_material_id uuid, target_quantity numeric)
returns uuid language plpgsql security definer set search_path = public as $$
declare receipt public.material_sync_receipts%rowtype; ticket public.tickets%rowtype; body jsonb; record_id uuid;
begin
  if auth.uid() is null or not exists (select 1 from public.user_profiles where id = auth.uid() and active) then raise exception 'MATERIAL_SYNC_NOT_AUTHORIZED'; end if;
  if target_action_id is null or target_ticket_id is null or target_material_id is null or expected_version is null or expected_version < 1 or target_quantity is null or target_quantity <= 0 or target_quantity > 100000 or target_quantity <> trunc(target_quantity, 3) then raise exception 'MATERIAL_SYNC_INVALID_INPUT'; end if;
  body := jsonb_build_object('ticket', target_ticket_id, 'version', expected_version, 'material', target_material_id, 'quantity', target_quantity);
  perform pg_advisory_xact_lock(hashtextextended('material:' || auth.uid()::text || ':' || target_action_id::text, 0));
  select * into receipt from public.material_sync_receipts where actor_id = auth.uid() and action_id = target_action_id;
  if receipt.material_record_id is not null then if receipt.payload <> body then raise exception 'MATERIAL_SYNC_KEY_REUSED'; end if; return receipt.material_record_id; end if;
  select * into ticket from public.tickets where id = target_ticket_id for update;
  if ticket.id is null or not public.is_ticket_assigned_to_current_user(ticket.assigned_technician_id) then raise exception 'MATERIAL_SYNC_NOT_AUTHORIZED'; end if;
  if ticket.version <> expected_version then raise exception 'MATERIAL_VERSION_CONFLICT'; end if;
  if ticket.operational_status not in ('WORK_STARTED', 'IN_PROGRESS') then raise exception 'MATERIAL_INVALID_STATE'; end if;
  record_id := public.add_ticket_material(target_ticket_id, target_material_id, target_quantity);
  insert into public.material_sync_receipts(actor_id, action_id, ticket_id, payload, material_record_id) values (auth.uid(), target_action_id, target_ticket_id, body, record_id);
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source) values (ticket.organization_id, auth.uid(), 'MATERIAL_SYNCED', 'ticket', ticket.id, jsonb_build_object('action_id', target_action_id, 'record_id', record_id), 'WEB');
  return record_id;
end;
$$;
revoke all on function public.sync_ticket_material(uuid, uuid, integer, uuid, numeric) from public;
grant execute on function public.sync_ticket_material(uuid, uuid, integer, uuid, numeric) to authenticated;
