-- A OS pode ser apenas de mão de obra. Materiais físicos são informados pelo
-- técnico quando existirem; a composição faturável é escolhida pelo gestor.
-- Remove somente a constraint antiga que exigia justificativa sem material.
do $$
declare old_constraint text;
begin
  select conname into old_constraint
    from pg_constraint
   where conrelid = 'public.ticket_completions'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%no_material_reason%'
   limit 1;
  if old_constraint is not null then
    execute format('alter table public.ticket_completions drop constraint %I', old_constraint);
  end if;
end;
$$;

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
    or (not target_materials_used and materials_count > 0) then raise exception 'COMPLETION_MATERIAL_DECLARATION_REQUIRED'; end if;
  if target_no_material_reason is not null and nullif(trim(target_no_material_reason), '') is not null
    and length(trim(target_no_material_reason)) not between 10 and 2000 then raise exception 'COMPLETION_MATERIAL_NOTE_INVALID'; end if;
  insert into public.ticket_completions(ticket_id, execution_record_id, technician_id, materials_used, no_material_reason, evidence_ids, material_ids)
  values (ticket.id, execution.id, ticket.assigned_technician_id, target_materials_used, nullif(trim(target_no_material_reason), ''),
    array(select id from public.ticket_evidences where ticket_id = ticket.id), array(select id from public.ticket_materials where ticket_id = ticket.id)) returning id into completion_id;
  update public.tickets set operational_status = 'TECHNICALLY_COMPLETED', administrative_status = 'AWAITING_REVIEW' where id = ticket.id;
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values (ticket.organization_id, auth.uid(), 'TECHNICAL_COMPLETION', 'ticket', ticket.id, jsonb_build_object('completion_id', completion_id), 'WEB');
  return completion_id;
end;
$$;
