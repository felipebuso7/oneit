create or replace function public.create_cab_meeting(target_organization_id uuid, target_title text, target_scheduled_at timestamptz, target_notes text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare meeting_id uuid;
begin
  if not public.has_organization_role(target_organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]) then raise exception 'CAB_NOT_AUTHORIZED'; end if;
  if length(trim(target_title)) not between 5 and 240 or target_scheduled_at is null then raise exception 'CAB_INVALID_INPUT'; end if;
  insert into public.cab_meetings(organization_id,title,scheduled_at,notes,created_by) values(target_organization_id,trim(target_title),target_scheduled_at,nullif(trim(target_notes),''),auth.uid()) returning id into meeting_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(target_organization_id,auth.uid(),'CAB_MEETING_CREATED','cab_meeting',meeting_id,jsonb_build_object('scheduled_at',target_scheduled_at),'WEB');
  return meeting_id;
end; $$;
revoke all on function public.create_cab_meeting(uuid,text,timestamptz,text) from public;
grant execute on function public.create_cab_meeting(uuid,text,timestamptz,text) to authenticated;

create or replace function public.add_change_to_cab(target_meeting_id uuid, target_change_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare meeting public.cab_meetings%rowtype; change_item public.changes%rowtype; item_id uuid;
begin
  select * into meeting from public.cab_meetings where id=target_meeting_id for update;
  select * into change_item from public.changes where id=target_change_id;
  if meeting.id is null or change_item.id is null or meeting.organization_id<>change_item.organization_id or not public.has_organization_role(meeting.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]) then raise exception 'CAB_ITEM_NOT_AUTHORIZED'; end if;
  insert into public.cab_change_items(cab_meeting_id,change_id) values(meeting.id,change_item.id) returning id into item_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(meeting.organization_id,auth.uid(),'CAB_CHANGE_ADDED','cab_meeting',meeting.id,jsonb_build_object('change_id',change_item.id),'WEB');
  return item_id;
end; $$;
revoke all on function public.add_change_to_cab(uuid,uuid) from public;
grant execute on function public.add_change_to_cab(uuid,uuid) to authenticated;
