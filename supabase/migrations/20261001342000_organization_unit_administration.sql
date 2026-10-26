-- Settings master data is administered only by organization administrators.
create or replace function public.create_organization_unit(target_organization_id uuid,target_type public.organization_unit_type,target_code text,target_name text)
returns uuid language plpgsql security definer set search_path=public as $$
declare unit_id uuid;
begin
  if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then raise exception 'ORGANIZATION_UNIT_NOT_AUTHORIZED'; end if;
  if coalesce(length(trim(target_code)),0) not between 1 and 100 or coalesce(length(trim(target_name)),0) not between 2 and 240 then raise exception 'ORGANIZATION_UNIT_INVALID_INPUT'; end if;
  insert into public.organization_units(organization_id,unit_type,code,name) values(target_organization_id,target_type,trim(target_code),trim(target_name)) returning id into unit_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(target_organization_id,auth.uid(),'ORGANIZATION_UNIT_CREATED','organization_unit',unit_id,jsonb_build_object('type',target_type,'code',trim(target_code)),'WEB');
  return unit_id;
end; $$;

create or replace function public.update_organization_unit(target_unit_id uuid,target_code text,target_name text,target_active boolean)
returns void language plpgsql security definer set search_path=public as $$
declare current_unit public.organization_units%rowtype;
begin
  select * into current_unit from public.organization_units where id=target_unit_id for update;
  if current_unit.id is null then raise exception 'ORGANIZATION_UNIT_NOT_FOUND'; end if;
  if not public.has_organization_role(current_unit.organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then raise exception 'ORGANIZATION_UNIT_NOT_AUTHORIZED'; end if;
  if coalesce(length(trim(target_code)),0) not between 1 and 100 or coalesce(length(trim(target_name)),0) not between 2 and 240 then raise exception 'ORGANIZATION_UNIT_INVALID_INPUT'; end if;
  update public.organization_units set code=trim(target_code),name=trim(target_name),active=target_active where id=current_unit.id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,before_value,after_value,source) values(current_unit.organization_id,auth.uid(),'ORGANIZATION_UNIT_UPDATED','organization_unit',current_unit.id,jsonb_build_object('code',current_unit.code,'name',current_unit.name,'active',current_unit.active),jsonb_build_object('code',trim(target_code),'name',trim(target_name),'active',target_active),'WEB');
end; $$;

revoke all on function public.create_organization_unit(uuid,public.organization_unit_type,text,text), public.update_organization_unit(uuid,text,text,boolean) from public;
grant execute on function public.create_organization_unit(uuid,public.organization_unit_type,text,text), public.update_organization_unit(uuid,text,text,boolean) to authenticated;
