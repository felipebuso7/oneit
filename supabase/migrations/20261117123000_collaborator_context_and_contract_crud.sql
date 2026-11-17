alter table public.collaborators add column if not exists phone text;
alter table public.collaborators add column if not exists manager_collaborator_id uuid references public.collaborators(id) on delete set null;
alter table public.collaborators add column if not exists location_id uuid references public.customer_locations(id) on delete set null;

create or replace function public.create_collaborator_with_context(target_organization_id uuid,target_employee_number text,target_full_name text,target_primary_email text default null,target_phone text default null,target_manager_collaborator_id uuid default null,target_location_id uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare collaborator_id uuid; normalized_email text;
begin
 if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]) then raise exception 'COLLABORATOR_NOT_AUTHORIZED'; end if;
 if coalesce(length(trim(target_employee_number)),0) not between 1 and 100 or coalesce(length(trim(target_full_name)),0) not between 2 and 240 then raise exception 'COLLABORATOR_INVALID_INPUT'; end if;
 if target_manager_collaborator_id is not null and not exists(select 1 from public.collaborators where id=target_manager_collaborator_id and organization_id=target_organization_id and status='ACTIVE') then raise exception 'COLLABORATOR_INVALID_MANAGER'; end if;
 if target_location_id is not null and not exists(select 1 from public.customer_locations where id=target_location_id and organization_id=target_organization_id and active) then raise exception 'COLLABORATOR_INVALID_LOCATION'; end if;
 normalized_email:=nullif(lower(trim(target_primary_email)), '');
 insert into public.collaborators(organization_id,employee_number,full_name,phone,manager_collaborator_id,location_id,created_by) values(target_organization_id,trim(target_employee_number),trim(target_full_name),nullif(trim(target_phone),''),target_manager_collaborator_id,target_location_id,auth.uid()) returning id into collaborator_id;
 if normalized_email is not null then insert into public.collaborator_email_aliases(organization_id,collaborator_id,email,is_primary,verified_at) values(target_organization_id,collaborator_id,normalized_email,true,null); end if;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(target_organization_id,auth.uid(),'COLLABORATOR_CREATED','collaborator',collaborator_id,jsonb_build_object('location_id',target_location_id,'manager_collaborator_id',target_manager_collaborator_id),'WEB');
 return collaborator_id;
end; $$;
revoke all on function public.create_collaborator_with_context(uuid,text,text,text,text,uuid,uuid) from public;
grant execute on function public.create_collaborator_with_context(uuid,text,text,text,text,uuid,uuid) to authenticated;

create or replace function public.update_contract(target_contract_id uuid,target_code text,target_name text,target_starts_at date,target_ends_at date,target_customer_owner_name text,target_service_hours text,target_scope_summary text,target_exclusions_summary text,target_renewal_automatic boolean,target_renewal_notice_days integer)
returns uuid language plpgsql security definer set search_path=public as $$
declare item public.contracts%rowtype;
begin
 select * into item from public.contracts where id=target_contract_id for update;
 if item.id is null or not public.has_organization_role(item.organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then raise exception 'CONTRACT_NOT_AUTHORIZED'; end if;
 if length(trim(target_code))<2 or length(trim(target_name))<2 or target_ends_at is not null and target_ends_at<target_starts_at then raise exception 'CONTRACT_INVALID_INPUT'; end if;
 update public.contracts set code=trim(target_code),name=trim(target_name),starts_at=target_starts_at,ends_at=target_ends_at,customer_owner_name=nullif(trim(target_customer_owner_name),''),service_hours=nullif(trim(target_service_hours),''),scope_summary=nullif(trim(target_scope_summary),''),exclusions_summary=nullif(trim(target_exclusions_summary),''),renewal_automatic=target_renewal_automatic,renewal_notice_days=target_renewal_notice_days,updated_at=now() where id=item.id;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(item.organization_id,auth.uid(),'CONTRACT_UPDATED','contract',item.id,jsonb_build_object('code',target_code,'name',target_name),'WEB'); return item.id;
end; $$;
create or replace function public.archive_contract(target_contract_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare item public.contracts%rowtype;
begin select * into item from public.contracts where id=target_contract_id for update; if item.id is null or not public.has_organization_role(item.organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then raise exception 'CONTRACT_NOT_AUTHORIZED'; end if; update public.contracts set active=false,status='CLOSED',updated_at=now() where id=item.id; insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(item.organization_id,auth.uid(),'CONTRACT_ARCHIVED','contract',item.id,'{"active":false}'::jsonb,'WEB'); return item.id; end; $$;
revoke all on function public.update_contract(uuid,text,text,date,date,text,text,text,text,boolean,integer),public.archive_contract(uuid) from public;
grant execute on function public.update_contract(uuid,text,text,date,date,text,text,text,text,boolean,integer),public.archive_contract(uuid) to authenticated;
