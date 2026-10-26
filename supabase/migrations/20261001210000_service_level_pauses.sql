alter table public.ticket_service_levels add column paused_seconds integer not null default 0 check (paused_seconds >= 0);
create table public.ticket_service_level_pauses (
  id uuid primary key default gen_random_uuid(), ticket_service_level_id uuid not null references public.ticket_service_levels(id) on delete restrict,
  ticket_id uuid not null references public.tickets(id) on delete restrict, actor_id uuid not null references public.user_profiles(id) on delete restrict,
  reason text not null check (length(trim(reason)) between 10 and 2000), started_at timestamptz not null default clock_timestamp(), resumed_at timestamptz, resolution_reason text check (resolution_reason is null or length(trim(resolution_reason)) between 10 and 2000)
);
create unique index ticket_service_level_one_open_pause on public.ticket_service_level_pauses(ticket_service_level_id) where resumed_at is null;
create index ticket_service_level_pauses_ticket on public.ticket_service_level_pauses(ticket_id, started_at desc);
alter table public.ticket_service_level_pauses enable row level security;
create policy "management reads service level pauses" on public.ticket_service_level_pauses for select to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_id and public.has_ticket_management_role(t.organization_id)));
create or replace function public.pause_ticket_service_level(target_ticket_id uuid, expected_version integer, target_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare ticket public.tickets%rowtype; level public.ticket_service_levels%rowtype; pause_id uuid;
begin
  select * into ticket from public.tickets where id = target_ticket_id for update;
  if ticket.id is null or not public.has_ticket_management_role(ticket.organization_id) then raise exception 'SLA_PAUSE_NOT_AUTHORIZED'; end if;
  if expected_version is null or ticket.version <> expected_version then raise exception 'SLA_PAUSE_VERSION_CONFLICT'; end if;
  if target_reason is null or length(trim(target_reason)) not between 10 and 2000 then raise exception 'SLA_PAUSE_INVALID_INPUT'; end if;
  select * into level from public.ticket_service_levels where ticket_id = ticket.id for update;
  if level.id is null then raise exception 'SLA_PAUSE_NO_ACTIVE_LEVEL'; end if;
  if exists (select 1 from public.ticket_service_level_pauses where ticket_service_level_id = level.id and resumed_at is null) then raise exception 'SLA_PAUSE_ALREADY_OPEN'; end if;
  insert into public.ticket_service_level_pauses(ticket_service_level_id, ticket_id, actor_id, reason) values (level.id, ticket.id, auth.uid(), trim(target_reason)) returning id into pause_id;
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source) values (ticket.organization_id, auth.uid(), 'SLA_PAUSED', 'ticket', ticket.id, jsonb_build_object('pause_id', pause_id, 'reason', trim(target_reason)), 'WEB');
  return pause_id;
end;
$$;
create or replace function public.resume_ticket_service_level(target_ticket_id uuid, expected_version integer, target_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare ticket public.tickets%rowtype; level public.ticket_service_levels%rowtype; pause public.ticket_service_level_pauses%rowtype; elapsed integer;
begin
  select * into ticket from public.tickets where id = target_ticket_id for update;
  if ticket.id is null or not public.has_ticket_management_role(ticket.organization_id) then raise exception 'SLA_PAUSE_NOT_AUTHORIZED'; end if;
  if expected_version is null or ticket.version <> expected_version then raise exception 'SLA_PAUSE_VERSION_CONFLICT'; end if;
  if target_reason is null or length(trim(target_reason)) not between 10 and 2000 then raise exception 'SLA_PAUSE_INVALID_INPUT'; end if;
  select * into level from public.ticket_service_levels where ticket_id = ticket.id for update;
  if level.id is null then raise exception 'SLA_PAUSE_NO_ACTIVE_LEVEL'; end if;
  select * into pause from public.ticket_service_level_pauses where ticket_service_level_id = level.id and resumed_at is null for update;
  if pause.id is null then raise exception 'SLA_PAUSE_NOT_OPEN'; end if;
  elapsed := greatest(0, floor(extract(epoch from (clock_timestamp() - pause.started_at)))::integer);
  update public.ticket_service_levels set paused_seconds = paused_seconds + elapsed, response_due_at = response_due_at + make_interval(secs => elapsed), resolution_due_at = resolution_due_at + make_interval(secs => elapsed), ola_due_at = ola_due_at + make_interval(secs => elapsed) where id = level.id;
  update public.ticket_service_level_pauses set resumed_at = clock_timestamp(), resolution_reason = trim(target_reason) where id = pause.id;
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source) values (ticket.organization_id, auth.uid(), 'SLA_RESUMED', 'ticket', ticket.id, jsonb_build_object('pause_id', pause.id, 'elapsed_seconds', elapsed, 'reason', trim(target_reason)), 'WEB');
  return pause.id;
end;
$$;
revoke all on function public.pause_ticket_service_level(uuid, integer, text), public.resume_ticket_service_level(uuid, integer, text) from public;
grant execute on function public.pause_ticket_service_level(uuid, integer, text), public.resume_ticket_service_level(uuid, integer, text) to authenticated;
