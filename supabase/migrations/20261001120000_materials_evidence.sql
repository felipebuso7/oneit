create table public.materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  code text not null, name text not null, unit text not null, active boolean not null default true
);
create unique index materials_org_code on public.materials(organization_id, code) nulls not distinct;
insert into public.materials(code, name, unit) values
  ('RJ45', 'Conector RJ45', 'un'), ('KEYSTONE', 'Keystone', 'un'),
  ('PATCH_CORD', 'Patch cord', 'un'), ('CAT6', 'Cabo CAT6', 'm');

create table public.ticket_materials (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  technician_id uuid not null references public.technicians(id) on delete restrict,
  material_id uuid not null references public.materials(id) on delete restrict,
  material_code text not null, material_name text not null, unit text not null,
  quantity numeric(12,3) not null check (quantity > 0 and quantity <= 100000),
  created_at timestamptz not null default now()
);
create table public.ticket_evidences (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  technician_id uuid not null references public.technicians(id) on delete restrict,
  evidence_type text not null check (evidence_type in ('ARRIVAL','BEFORE','DURING','AFTER','TEST_RESULT','MATERIAL','ACCESS_EXCEPTION','SAFETY','OTHER')),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 4194304),
  created_at timestamptz not null default now()
);
create index ticket_materials_ticket on public.ticket_materials(ticket_id, created_at);
create index ticket_evidences_ticket on public.ticket_evidences(ticket_id, created_at);
alter table public.materials enable row level security;
alter table public.ticket_materials enable row level security;
alter table public.ticket_evidences enable row level security;
create policy "read visible materials" on public.materials for select to authenticated using (organization_id is null or public.is_organization_member(organization_id));
create policy "read visible ticket materials" on public.ticket_materials for select to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_id));
create policy "read visible ticket evidences" on public.ticket_evidences for select to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_id));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('ticket-evidences', 'ticket-evidences', false, 4194304, array['image/jpeg','image/png','image/webp']);
-- Uploads use a validated server-only client. No INSERT/UPDATE/DELETE grant via Storage RLS.
create policy "read registered evidence objects" on storage.objects for select to authenticated
using (bucket_id = 'ticket-evidences' and exists (select 1 from public.ticket_evidences e where e.storage_path = name));

create or replace function public.add_ticket_material(target_ticket_id uuid, target_material_id uuid, target_quantity numeric)
returns uuid language plpgsql security definer set search_path = public as $$
declare ticket public.tickets%rowtype; material public.materials%rowtype; record_id uuid;
begin
  select * into ticket from public.tickets where id = target_ticket_id for update;
  if ticket.id is null or not public.is_ticket_assigned_to_current_user(ticket.assigned_technician_id) then raise exception 'MATERIAL_NOT_AUTHORIZED'; end if;
  if ticket.operational_status not in ('WORK_STARTED','IN_PROGRESS') then raise exception 'MATERIAL_INVALID_STATE'; end if;
  select * into material from public.materials where id = target_material_id and active and (organization_id is null or organization_id = ticket.organization_id);
  if material.id is null then raise exception 'MATERIAL_INVALID_SELECTION'; end if;
  insert into public.ticket_materials(ticket_id, technician_id, material_id, material_code, material_name, unit, quantity)
  values (ticket.id, ticket.assigned_technician_id, material.id, material.code, material.name, material.unit, target_quantity) returning id into record_id;
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values (ticket.organization_id, auth.uid(), 'MATERIAL_RECORDED', 'ticket', ticket.id, jsonb_build_object('record_id', record_id, 'material_id', material.id, 'quantity', target_quantity), 'WEB');
  return record_id;
end;
$$;

create or replace function public.register_ticket_evidence(target_ticket_id uuid, target_type text, target_path text, target_mime text, target_size integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare ticket public.tickets%rowtype; record_id uuid;
begin
  select * into ticket from public.tickets where id = target_ticket_id for update;
  if ticket.id is null or not public.is_ticket_assigned_to_current_user(ticket.assigned_technician_id) then raise exception 'EVIDENCE_NOT_AUTHORIZED'; end if;
  if ticket.operational_status not in ('ON_SITE','WORK_STARTED','IN_PROGRESS') then raise exception 'EVIDENCE_INVALID_STATE'; end if;
  if target_path not like ticket.organization_id::text || '/' || ticket.id::text || '/%' then raise exception 'EVIDENCE_INVALID_PATH'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'ticket-evidences' and name = target_path and metadata->>'mimetype' = target_mime and (metadata->>'size')::bigint = target_size) then raise exception 'EVIDENCE_OBJECT_MISSING'; end if;
  insert into public.ticket_evidences(ticket_id, technician_id, evidence_type, storage_path, mime_type, size_bytes)
  values (ticket.id, ticket.assigned_technician_id, target_type, target_path, target_mime, target_size) returning id into record_id;
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values (ticket.organization_id, auth.uid(), 'EVIDENCE_RECORDED', 'ticket', ticket.id, jsonb_build_object('record_id', record_id, 'type', target_type), 'WEB');
  return record_id;
end;
$$;
revoke all on function public.add_ticket_material(uuid, uuid, numeric), public.register_ticket_evidence(uuid, text, text, text, integer) from public;
grant execute on function public.add_ticket_material(uuid, uuid, numeric), public.register_ticket_evidence(uuid, text, text, text, integer) to authenticated;
