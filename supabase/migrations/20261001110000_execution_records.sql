create type public.fault_domain as enum ('CABLING', 'ACTIVE_NETWORK_EQUIPMENT', 'ENDPOINT', 'POWER', 'CLIENT_SYSTEM', 'UNKNOWN', 'OTHER');

create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  item_code text not null,
  label text not null,
  position integer not null,
  required boolean not null default true
);
create unique index checklist_template_org_code on public.checklist_templates(organization_id, item_code) nulls not distinct;
insert into public.checklist_templates(item_code, label, position) values
  ('IDENTIFY', 'Identificar o ponto e a unidade atendida', 1),
  ('DIAGNOSE', 'Realizar diagnóstico físico do problema', 2),
  ('TEST', 'Testar o ponto após a intervenção', 3),
  ('VALIDATE', 'Validar o resultado do atendimento', 4);

-- Snapshot: changing a template cannot change the checklist of an existing execution.
create table public.ticket_checklist_items (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  item_code text not null, label text not null, position integer not null,
  required boolean not null, unique(ticket_id, item_code)
);
create table public.ticket_execution_records (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  technician_id uuid not null references public.technicians(id) on delete restrict,
  fault_domain public.fault_domain not null,
  diagnosis text not null check (length(trim(diagnosis)) between 10 and 10000),
  solution text not null check (length(trim(solution)) between 10 and 10000),
  checklist_answers jsonb not null check (jsonb_typeof(checklist_answers) = 'object'),
  created_at timestamptz not null default now()
);
create index execution_records_ticket_date on public.ticket_execution_records(ticket_id, created_at desc);

alter table public.checklist_templates enable row level security;
alter table public.ticket_checklist_items enable row level security;
alter table public.ticket_execution_records enable row level security;
create policy "members read checklist templates" on public.checklist_templates for select to authenticated using (organization_id is null or public.is_organization_member(organization_id));
create policy "admins manage checklist templates" on public.checklist_templates for all to authenticated using (public.has_organization_role(organization_id, array['ORG_ADMIN','SUPER_ADMIN']::public.platform_role[])) with check (organization_id is not null and public.has_organization_role(organization_id, array['ORG_ADMIN','SUPER_ADMIN']::public.platform_role[]));
create policy "read visible ticket checklist" on public.ticket_checklist_items for select to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_id));
create policy "read visible ticket execution" on public.ticket_execution_records for select to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_id));

create or replace function public.save_ticket_execution(
  target_ticket_id uuid, expected_version integer, target_fault_domain public.fault_domain,
  target_diagnosis text, target_solution text, target_answers jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare ticket public.tickets%rowtype; record_id uuid;
begin
  select * into ticket from public.tickets where id = target_ticket_id for update;
  if ticket.id is null or not public.is_ticket_assigned_to_current_user(ticket.assigned_technician_id) then
    raise exception 'EXECUTION_NOT_AUTHORIZED';
  end if;
  if ticket.version <> expected_version then raise exception 'EXECUTION_VERSION_CONFLICT'; end if;
  if ticket.operational_status not in ('WORK_STARTED', 'IN_PROGRESS') then raise exception 'EXECUTION_INVALID_STATE'; end if;
  if not exists (select 1 from public.ticket_checklist_items where ticket_id = ticket.id) then
    insert into public.ticket_checklist_items(ticket_id, item_code, label, position, required)
    select ticket.id, item_code, label, position, required from public.checklist_templates
    where organization_id = ticket.organization_id
      or (organization_id is null and not exists (select 1 from public.checklist_templates where organization_id = ticket.organization_id));
  end if;
  if target_answers is null or jsonb_typeof(target_answers) <> 'object' then raise exception 'EXECUTION_INVALID_CHECKLIST'; end if;
  if (select count(*) from jsonb_object_keys(target_answers)) <> (select count(*) from public.ticket_checklist_items where ticket_id = ticket.id)
    or exists (select 1 from public.ticket_checklist_items i where i.ticket_id = ticket.id
      and (not target_answers ? i.item_code or jsonb_typeof(target_answers -> i.item_code) <> 'boolean')) then
    raise exception 'EXECUTION_INVALID_CHECKLIST';
  end if;
  insert into public.ticket_execution_records(ticket_id, technician_id, fault_domain, diagnosis, solution, checklist_answers)
  values (ticket.id, ticket.assigned_technician_id, target_fault_domain, target_diagnosis, target_solution, target_answers)
  returning id into record_id;
  update public.tickets set operational_status = case when target_fault_domain = 'CABLING' then 'IN_PROGRESS'::public.ticket_operational_status else 'OUT_OF_SCOPE'::public.ticket_operational_status end where id = ticket.id;
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values (ticket.organization_id, auth.uid(), 'EXECUTION_RECORDED', 'ticket', ticket.id, jsonb_build_object('record_id', record_id, 'fault_domain', target_fault_domain), 'WEB');
  return record_id;
end;
$$;
revoke all on function public.save_ticket_execution(uuid, integer, public.fault_domain, text, text, jsonb) from public;
grant execute on function public.save_ticket_execution(uuid, integer, public.fault_domain, text, text, jsonb) to authenticated;
