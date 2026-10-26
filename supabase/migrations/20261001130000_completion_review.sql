create table public.ticket_completions (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  execution_record_id uuid not null references public.ticket_execution_records(id) on delete restrict,
  technician_id uuid not null references public.technicians(id) on delete restrict,
  materials_used boolean not null,
  no_material_reason text,
  evidence_ids uuid[] not null,
  material_ids uuid[] not null,
  created_at timestamptz not null default now(),
  check (materials_used or coalesce(length(trim(no_material_reason)), 0) >= 10)
);
create table public.ticket_reviews (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  completion_id uuid not null unique references public.ticket_completions(id) on delete restrict,
  reviewer_id uuid not null references public.user_profiles(id) on delete restrict,
  decision text not null check (decision in ('APPROVE', 'RETURN')),
  reason text not null check (length(trim(reason)) between 10 and 2000),
  created_at timestamptz not null default now()
);
create index ticket_completions_date on public.ticket_completions(ticket_id, created_at desc);
create index ticket_reviews_date on public.ticket_reviews(ticket_id, created_at desc);
alter table public.ticket_completions enable row level security;
alter table public.ticket_reviews enable row level security;
create policy "read visible completions" on public.ticket_completions for select to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_id));
create policy "read visible reviews" on public.ticket_reviews for select to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_id));

create or replace function public.complete_ticket(target_ticket_id uuid, expected_version integer, target_materials_used boolean, target_no_material_reason text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare ticket public.tickets%rowtype; execution public.ticket_execution_records%rowtype; completion_id uuid; materials_count integer;
begin
  select * into ticket from public.tickets where id = target_ticket_id for update;
  if ticket.id is null or not public.is_ticket_assigned_to_current_user(ticket.assigned_technician_id) then raise exception 'COMPLETION_NOT_AUTHORIZED'; end if;
  if expected_version is null or ticket.version <> expected_version then raise exception 'COMPLETION_VERSION_CONFLICT'; end if;
  if ticket.operational_status <> 'IN_PROGRESS' then raise exception 'COMPLETION_INVALID_STATE'; end if;
  select * into execution from public.ticket_execution_records where ticket_id = ticket.id order by created_at desc limit 1;
  if execution.id is null or execution.fault_domain <> 'CABLING' then raise exception 'COMPLETION_DIAGNOSIS_REQUIRED'; end if;
  if not exists (select 1 from public.ticket_checklist_items where ticket_id = ticket.id)
    or exists (select 1 from public.ticket_checklist_items where ticket_id = ticket.id and required and (execution.checklist_answers->item_code) is distinct from 'true'::jsonb) then raise exception 'COMPLETION_CHECKLIST_REQUIRED'; end if;
  if exists (select required_type from unnest(array['BEFORE','AFTER','TEST_RESULT']) required_type
    where not exists (select 1 from public.ticket_evidences where ticket_id = ticket.id and evidence_type = required_type)) then raise exception 'COMPLETION_EVIDENCES_REQUIRED'; end if;
  if (select count(distinct event_type) from public.ticket_field_events where ticket_id = ticket.id) <> 3 then raise exception 'COMPLETION_CHECKINS_REQUIRED'; end if;
  select count(*) into materials_count from public.ticket_materials where ticket_id = ticket.id;
  if target_materials_used is null or (target_materials_used and materials_count = 0)
    or (not target_materials_used and (materials_count > 0 or coalesce(length(trim(target_no_material_reason)), 0) < 10)) then raise exception 'COMPLETION_MATERIAL_DECLARATION_REQUIRED'; end if;
  insert into public.ticket_completions(ticket_id, execution_record_id, technician_id, materials_used, no_material_reason, evidence_ids, material_ids)
  values (ticket.id, execution.id, ticket.assigned_technician_id, target_materials_used, target_no_material_reason,
    array(select id from public.ticket_evidences where ticket_id = ticket.id), array(select id from public.ticket_materials where ticket_id = ticket.id)) returning id into completion_id;
  update public.tickets set operational_status = 'TECHNICALLY_COMPLETED', administrative_status = 'AWAITING_REVIEW' where id = ticket.id;
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values (ticket.organization_id, auth.uid(), 'TECHNICAL_COMPLETION', 'ticket', ticket.id, jsonb_build_object('completion_id', completion_id), 'WEB');
  return completion_id;
end;
$$;

create or replace function public.review_ticket(target_ticket_id uuid, expected_version integer, target_decision text, target_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare ticket public.tickets%rowtype; completion public.ticket_completions%rowtype; review_id uuid;
begin
  select * into ticket from public.tickets where id = target_ticket_id for update;
  if ticket.id is null or not public.has_organization_role(ticket.organization_id, array['MANAGER','ORG_ADMIN','SUPER_ADMIN']::public.platform_role[])
    or not exists (select 1 from public.user_profiles where id = auth.uid() and active) then raise exception 'REVIEW_NOT_AUTHORIZED'; end if;
  if expected_version is null or ticket.version <> expected_version then raise exception 'REVIEW_VERSION_CONFLICT'; end if;
  if ticket.operational_status <> 'TECHNICALLY_COMPLETED' or ticket.administrative_status <> 'AWAITING_REVIEW' then raise exception 'REVIEW_INVALID_STATE'; end if;
  select * into completion from public.ticket_completions where ticket_id = ticket.id order by created_at desc limit 1;
  if completion.id is null then raise exception 'REVIEW_COMPLETION_REQUIRED'; end if;
  if exists (select 1 from public.technicians where id = completion.technician_id and user_id = auth.uid()) then raise exception 'REVIEW_SELF_APPROVAL_FORBIDDEN'; end if;
  if target_decision is null or target_decision not in ('APPROVE','RETURN') then raise exception 'REVIEW_INVALID_DECISION'; end if;
  insert into public.ticket_reviews(ticket_id, completion_id, reviewer_id, decision, reason)
  values (ticket.id, completion.id, auth.uid(), target_decision, target_reason) returning id into review_id;
  if target_decision = 'APPROVE' then
    update public.tickets set administrative_status = 'APPROVED' where id = ticket.id;
  else
    update public.tickets set operational_status = 'IN_PROGRESS', administrative_status = 'RETURNED_TO_TECHNICIAN' where id = ticket.id;
  end if;
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values (ticket.organization_id, auth.uid(), 'MANAGER_REVIEW', 'ticket', ticket.id, jsonb_build_object('review_id', review_id, 'decision', target_decision, 'reason', target_reason), 'WEB');
  return review_id;
end;
$$;
revoke all on function public.complete_ticket(uuid, integer, boolean, text), public.review_ticket(uuid, integer, text, text) from public;
grant execute on function public.complete_ticket(uuid, integer, boolean, text), public.review_ticket(uuid, integer, text, text) to authenticated;

-- Prevent direct Data API writes from bypassing workflow prerequisites.
revoke update on public.tickets from authenticated, anon, public;
grant update(title, description, impact, urgency) on public.tickets to authenticated;
alter function public.schedule_ticket(uuid, uuid, timestamptz, timestamptz) security definer;
alter function public.assign_ticket(uuid, uuid) security definer;

create or replace function public.triage_ticket(target_ticket_id uuid, expected_version integer, target_status public.ticket_operational_status)
returns void language plpgsql security definer set search_path = public as $$
declare ticket public.tickets%rowtype;
begin
  select * into ticket from public.tickets where id = target_ticket_id for update;
  if ticket.id is null or not public.has_ticket_management_role(ticket.organization_id) then raise exception 'TRIAGE_NOT_AUTHORIZED'; end if;
  if expected_version is null or ticket.version <> expected_version then raise exception 'TRIAGE_VERSION_CONFLICT'; end if;
  if not ((ticket.operational_status = 'NEW' and target_status = 'TRIAGE') or (ticket.operational_status = 'TRIAGE' and target_status = 'AWAITING_SCHEDULING')) then raise exception 'TRIAGE_INVALID_STATE'; end if;
  update public.tickets set operational_status = target_status where id = ticket.id;
end;
$$;
revoke all on function public.triage_ticket(uuid, integer, public.ticket_operational_status) from public;
grant execute on function public.triage_ticket(uuid, integer, public.ticket_operational_status) to authenticated;

create or replace function public.validate_initial_ticket_workflow()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.operational_status <> 'NEW' or new.administrative_status <> 'AWAITING_TRIAGE'
    or new.assigned_technician_id is not null or new.scheduled_at is not null or new.version <> 1 then raise exception 'TICKET_INITIAL_STATE_REQUIRED'; end if;
  return new;
end;
$$;
create trigger tickets_initial_workflow before insert on public.tickets for each row execute function public.validate_initial_ticket_workflow();
