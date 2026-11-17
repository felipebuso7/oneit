alter table public.organization_units add column if not exists customer_id uuid references public.customers(id) on delete restrict;
create index if not exists organization_units_customer_idx on public.organization_units(customer_id, unit_type, active);

create or replace function public.create_organization_unit_for_customer(target_organization_id uuid, target_customer_id uuid, target_name text, target_code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare unit_id uuid;
begin
  if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then raise exception 'ORGANIZATION_UNIT_NOT_AUTHORIZED'; end if;
  if not exists(select 1 from public.customers where id=target_customer_id and organization_id=target_organization_id) then raise exception 'ORGANIZATION_UNIT_INVALID_CUSTOMER'; end if;
  if coalesce(length(trim(target_name)),0) not between 2 and 240 then raise exception 'ORGANIZATION_UNIT_INVALID_INPUT'; end if;
  insert into public.organization_units(organization_id,customer_id,unit_type,code,name) values(target_organization_id,target_customer_id,'DEPARTMENT',trim(target_code),trim(target_name)) returning id into unit_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(target_organization_id,auth.uid(),'DEPARTMENT_CREATED','organization_unit',unit_id,jsonb_build_object('customer_id',target_customer_id,'name',trim(target_name)),'WEB');
  return unit_id;
end; $$;
revoke all on function public.create_organization_unit_for_customer(uuid,uuid,text,text) from public;
grant execute on function public.create_organization_unit_for_customer(uuid,uuid,text,text) to authenticated;
