create type public.ticket_source as enum ('MANUAL','EMAIL','API','IMPORT');

alter table public.tickets
  add column source public.ticket_source not null default 'MANUAL',
  add column requester_collaborator_id uuid references public.collaborators(id) on delete set null,
  add column department_unit_id uuid references public.organization_units(id) on delete set null;

create index tickets_intake_source_status_idx on public.tickets(organization_id,source,operational_status,created_at desc);
create index tickets_requester_idx on public.tickets(requester_collaborator_id,created_at desc);

create or replace function public.validate_ticket_intake_links()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.requester_collaborator_id is not null and not exists(select 1 from public.collaborators where id=new.requester_collaborator_id and organization_id=new.organization_id and status='ACTIVE') then raise exception 'TICKET_REQUESTER_INVALID'; end if;
  if new.department_unit_id is not null and not exists(select 1 from public.organization_units where id=new.department_unit_id and organization_id=new.organization_id and unit_type='DEPARTMENT' and active) then raise exception 'TICKET_DEPARTMENT_INVALID'; end if;
  return new;
end; $$;
create trigger tickets_validate_intake_links before insert or update of organization_id,requester_collaborator_id,department_unit_id on public.tickets for each row execute function public.validate_ticket_intake_links();

create type public.ticket_communication_audience as enum ('CUSTOMER','INTERNAL');
create type public.ticket_communication_delivery_status as enum ('NOT_REQUESTED','QUEUED','SENT','FAILED');
create table public.ticket_communications(
  id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.tickets(id) on delete restrict,organization_id uuid not null references public.organizations(id) on delete restrict,
  audience public.ticket_communication_audience not null,message text not null check(length(trim(message)) between 3 and 12000),target_email text,
  delivery_status public.ticket_communication_delivery_status not null default 'NOT_REQUESTED',created_by uuid not null references public.user_profiles(id) on delete restrict,created_at timestamptz not null default now()
);
create index ticket_communications_ticket_idx on public.ticket_communications(ticket_id,created_at);
alter table public.ticket_communications enable row level security;
create policy "management reads ticket communications" on public.ticket_communications for select to authenticated using(public.has_ticket_management_role(organization_id));

create or replace function public.post_ticket_communication(target_ticket_id uuid,target_audience public.ticket_communication_audience,target_message text)
returns uuid language plpgsql security definer set search_path=public as $$
declare ticket_record public.tickets%rowtype; destination text; communication_id uuid;
begin
  select * into ticket_record from public.tickets where id=target_ticket_id for update;
  if ticket_record.id is null or not public.has_ticket_management_role(ticket_record.organization_id) then raise exception 'TICKET_COMMUNICATION_NOT_AUTHORIZED'; end if;
  if coalesce(length(trim(target_message)),0) not between 3 and 12000 then raise exception 'TICKET_COMMUNICATION_INVALID_MESSAGE'; end if;
  if target_audience='CUSTOMER' then
    select email into destination from public.collaborator_email_aliases where collaborator_id=ticket_record.requester_collaborator_id and active and verified_at is not null order by is_primary desc,created_at limit 1;
    if destination is null then raise exception 'TICKET_COMMUNICATION_REQUESTER_EMAIL_REQUIRED'; end if;
  end if;
  insert into public.ticket_communications(ticket_id,organization_id,audience,message,target_email,delivery_status,created_by)
  values(ticket_record.id,ticket_record.organization_id,target_audience,trim(target_message),destination,case when target_audience='CUSTOMER' then 'QUEUED'::public.ticket_communication_delivery_status else 'NOT_REQUESTED'::public.ticket_communication_delivery_status end,auth.uid()) returning id into communication_id;
  if target_audience='CUSTOMER' then
    insert into public.outbox_events(organization_id,event_type,aggregate_type,aggregate_id,payload,idempotency_key)
    values(ticket_record.organization_id,'EMAIL_SEND','TICKET_COMMUNICATION',communication_id,jsonb_build_object('ticket_id',ticket_record.id,'communication_id',communication_id,'to',destination,'subject',format('[%s] Atualização do chamado',ticket_record.ticket_number),'body',trim(target_message)),format('ticket-communication:%s',communication_id));
  end if;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(ticket_record.organization_id,auth.uid(),'TICKET_COMMUNICATION_POSTED','ticket_communication',communication_id,jsonb_build_object('ticket_id',ticket_record.id,'audience',target_audience,'email_queued',target_audience='CUSTOMER'),'WEB');
  return communication_id;
end; $$;

create or replace function public.update_ticket_triage_context(target_ticket_id uuid,target_requester_collaborator_id uuid,target_department_unit_id uuid,target_service_offering_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare ticket_record public.tickets%rowtype;
begin
  select * into ticket_record from public.tickets where id=target_ticket_id for update;
  if ticket_record.id is null or not public.has_ticket_management_role(ticket_record.organization_id) then raise exception 'TICKET_TRIAGE_NOT_AUTHORIZED'; end if;
  if ticket_record.operational_status not in ('NEW','TRIAGE') then raise exception 'TICKET_TRIAGE_INVALID_STATUS'; end if;
  update public.tickets set requester_collaborator_id=target_requester_collaborator_id,department_unit_id=target_department_unit_id,service_offering_id=target_service_offering_id where id=ticket_record.id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(ticket_record.organization_id,auth.uid(),'TICKET_TRIAGE_CONTEXT_UPDATED','ticket',ticket_record.id,jsonb_build_object('requester_collaborator_id',target_requester_collaborator_id,'department_unit_id',target_department_unit_id,'service_offering_id',target_service_offering_id),'WEB');
end; $$;

revoke all on function public.post_ticket_communication(uuid,public.ticket_communication_audience,text),public.update_ticket_triage_context(uuid,uuid,uuid,uuid) from public;
grant execute on function public.post_ticket_communication(uuid,public.ticket_communication_audience,text),public.update_ticket_triage_context(uuid,uuid,uuid,uuid) to authenticated;
