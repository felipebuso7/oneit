create or replace function public.create_collaborator_for_customer(target_organization_id uuid,target_customer_id uuid,target_full_name text,target_primary_email text default null,target_phone text default null,target_manager_collaborator_id uuid default null,target_location_id uuid default null,target_department_unit_id uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare collaborator_id uuid; generated_employee_number text;
begin
 if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]) then raise exception 'COLLABORATOR_NOT_AUTHORIZED'; end if;
 if not exists(select 1 from public.customers where id=target_customer_id and organization_id=target_organization_id) then raise exception 'COLLABORATOR_INVALID_CUSTOMER'; end if;
 if target_location_id is not null and not exists(select 1 from public.customer_locations where id=target_location_id and organization_id=target_organization_id and customer_id=target_customer_id and active) then raise exception 'COLLABORATOR_INVALID_LOCATION'; end if;
 if target_department_unit_id is not null and not exists(select 1 from public.organization_units where id=target_department_unit_id and organization_id=target_organization_id and customer_id=target_customer_id and unit_type='DEPARTMENT' and active) then raise exception 'COLLABORATOR_INVALID_DEPARTMENT'; end if;
 if nullif(trim(target_phone),'') is not null and trim(target_phone) !~ '^\(\d{2}\)\s?\d{4,5}-\d{4}$' then raise exception 'COLLABORATOR_INVALID_PHONE'; end if;
 generated_employee_number := 'AUTO-' || replace(gen_random_uuid()::text, '-', '');
 insert into public.collaborators(organization_id,customer_id,department_unit_id,employee_number,full_name,phone,manager_collaborator_id,location_id,created_by) values(target_organization_id,target_customer_id,target_department_unit_id,generated_employee_number,trim(target_full_name),nullif(trim(target_phone),''),target_manager_collaborator_id,target_location_id,auth.uid()) returning id into collaborator_id;
 if nullif(trim(target_primary_email),'') is not null then insert into public.collaborator_email_aliases(organization_id,collaborator_id,email,is_primary,verified_at) values(target_organization_id,collaborator_id,lower(trim(target_primary_email)),true,null); end if;
 return collaborator_id;
end; $$;
revoke all on function public.create_collaborator_for_customer(uuid,uuid,text,text,text,uuid,uuid,uuid) from public;
grant execute on function public.create_collaborator_for_customer(uuid,uuid,text,text,text,uuid,uuid,uuid) to authenticated;
