create or replace function public.update_service_catalog_item(target_kind text,target_id uuid,target_code text,target_name text,target_active boolean)
returns void language plpgsql security definer set search_path=public as $$
declare target_organization_id uuid; previous jsonb;
begin
  if target_kind not in ('category','subcategory','offering') then raise exception 'SERVICE_CATALOG_INVALID_KIND'; end if;
  if coalesce(length(trim(target_code)),0) not between 2 and 80 or trim(target_code) !~ '^[A-Z0-9][A-Z0-9_-]{1,79}$' or coalesce(length(trim(target_name)),0) not between 2 and 200 then raise exception 'SERVICE_CATALOG_INVALID_INPUT'; end if;
  if target_kind='category' then
    select organization_id,jsonb_build_object('code',code,'name',name,'active',active) into target_organization_id,previous from public.service_categories where id=target_id for update;
    if not target_active and exists(select 1 from public.service_subcategories where category_id=target_id and active) then raise exception 'SERVICE_CATALOG_ACTIVE_CHILDREN'; end if;
    if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then raise exception 'SERVICE_CATALOG_NOT_AUTHORIZED'; end if;
    update public.service_categories set code=trim(target_code),name=trim(target_name),active=target_active where id=target_id;
  elsif target_kind='subcategory' then
    select category.organization_id,jsonb_build_object('code',subcategory.code,'name',subcategory.name,'active',subcategory.active) into target_organization_id,previous from public.service_subcategories subcategory join public.service_categories category on category.id=subcategory.category_id where subcategory.id=target_id for update of subcategory;
    if not target_active and exists(select 1 from public.service_offerings where subcategory_id=target_id and active) then raise exception 'SERVICE_CATALOG_ACTIVE_CHILDREN'; end if;
    if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then raise exception 'SERVICE_CATALOG_NOT_AUTHORIZED'; end if;
    update public.service_subcategories set code=trim(target_code),name=trim(target_name),active=target_active where id=target_id;
  else
    select category.organization_id,jsonb_build_object('code',offering.code,'name',offering.name,'active',offering.active) into target_organization_id,previous from public.service_offerings offering join public.service_subcategories subcategory on subcategory.id=offering.subcategory_id join public.service_categories category on category.id=subcategory.category_id where offering.id=target_id for update of offering;
    if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then raise exception 'SERVICE_CATALOG_NOT_AUTHORIZED'; end if;
    update public.service_offerings set code=trim(target_code),name=trim(target_name),active=target_active where id=target_id;
  end if;
  if target_organization_id is null then raise exception 'SERVICE_CATALOG_NOT_FOUND'; end if;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,before_value,after_value,source) values(target_organization_id,auth.uid(),'SERVICE_CATALOG_ITEM_UPDATED','service_catalog_item',target_id,previous,jsonb_build_object('kind',target_kind,'code',trim(target_code),'name',trim(target_name),'active',target_active),'WEB');
end; $$;
revoke all on function public.update_service_catalog_item(text,uuid,text,text,boolean) from public;
grant execute on function public.update_service_catalog_item(text,uuid,text,text,boolean) to authenticated;
