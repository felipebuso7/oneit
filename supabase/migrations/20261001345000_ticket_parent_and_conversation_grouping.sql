-- Two explicit meanings: a child of a mass incident, or a duplicate imported conversation grouped under its canonical ticket.
create unique index entity_relationships_ticket_single_mass_parent
  on public.entity_relationships(organization_id,source_entity_id)
  where source_entity_type='TICKET' and target_entity_type='TICKET' and relationship_type='MASS_INCIDENT_PARENT';
create unique index entity_relationships_ticket_single_conversation_group
  on public.entity_relationships(organization_id,source_entity_id)
  where source_entity_type='TICKET' and target_entity_type='TICKET' and relationship_type='CONVERSATION_GROUPED';

create or replace function public.create_ticket_relationship(
  target_organization_id uuid,target_source_ticket_id uuid,target_target_ticket_id uuid,target_relationship_type text,target_reason text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare relationship_id uuid;
begin
  if not public.has_ticket_management_role(target_organization_id) then raise exception 'RELATIONSHIP_NOT_AUTHORIZED'; end if;
  if target_source_ticket_id=target_target_ticket_id then raise exception 'RELATIONSHIP_SAME_ENTITY'; end if;
  if target_relationship_type not in ('RELATED_TO','DUPLICATES','BLOCKS','CAUSED_BY','MASS_INCIDENT_PARENT','CONVERSATION_GROUPED') then raise exception 'RELATIONSHIP_INVALID_TYPE'; end if;
  if target_reason is not null and length(trim(target_reason)) not between 3 and 2000 then raise exception 'RELATIONSHIP_INVALID_REASON'; end if;
  if not exists(select 1 from public.tickets where id=target_source_ticket_id and organization_id=target_organization_id) or not exists(select 1 from public.tickets where id=target_target_ticket_id and organization_id=target_organization_id) then raise exception 'RELATIONSHIP_TICKET_OUT_OF_SCOPE'; end if;
  insert into public.entity_relationships(organization_id,source_entity_type,source_entity_id,target_entity_type,target_entity_id,relationship_type,reason,created_by) values(target_organization_id,'TICKET',target_source_ticket_id,'TICKET',target_target_ticket_id,target_relationship_type,nullif(trim(target_reason),''),auth.uid()) returning id into relationship_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(target_organization_id,auth.uid(),'ENTITY_RELATIONSHIP_CREATED','entity_relationship',relationship_id,jsonb_build_object('source_type','TICKET','source_id',target_source_ticket_id,'target_type','TICKET','target_id',target_target_ticket_id,'relationship_type',target_relationship_type),'WEB');
  return relationship_id;
end; $$;
revoke all on function public.create_ticket_relationship(uuid,uuid,uuid,text,text) from public;
grant execute on function public.create_ticket_relationship(uuid,uuid,uuid,text,text) to authenticated;
