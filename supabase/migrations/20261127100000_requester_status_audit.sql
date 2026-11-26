alter table public.collaborators add column if not exists inactive_reason text;
alter table public.collaborators add column if not exists inactive_at timestamptz;
alter table public.collaborators add column if not exists inactive_by uuid references public.user_profiles(id) on delete set null;
create or replace function public.update_collaborator(target_collaborator_id uuid,target_employee_number text default null,target_full_name text default null,target_status public.collaborator_status default null,target_inactive_reason text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare item public.collaborators%rowtype;
begin
 select * into item from public.collaborators where id=target_collaborator_id for update;
 if item.id is null or not public.has_organization_role(item.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]) then raise exception 'COLLABORATOR_NOT_AUTHORIZED'; end if;
 if target_status='INACTIVE' and coalesce(length(trim(target_inactive_reason)),0)<3 then raise exception 'COLLABORATOR_INACTIVE_REASON_REQUIRED'; end if;
 update public.collaborators set employee_number=coalesce(nullif(trim(target_employee_number),''),employee_number),full_name=coalesce(nullif(trim(target_full_name),''),full_name),status=coalesce(target_status,status),inactive_reason=case when target_status='INACTIVE' then trim(target_inactive_reason) when target_status='ACTIVE' then null else inactive_reason end,inactive_at=case when target_status='INACTIVE' then coalesce(inactive_at,now()) when target_status='ACTIVE' then null else inactive_at end,inactive_by=case when target_status='INACTIVE' then auth.uid() when target_status='ACTIVE' then null else inactive_by end,updated_at=now() where id=item.id;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(item.organization_id,auth.uid(),case when target_status='INACTIVE' then 'COLLABORATOR_DEACTIVATED' when target_status='ACTIVE' and item.status='INACTIVE' then 'COLLABORATOR_REACTIVATED' else 'COLLABORATOR_UPDATED' end,'collaborator',item.id,jsonb_build_object('status',coalesce(target_status,item.status),'reason',target_inactive_reason),'WEB');
 return item.id;
end; $$;
revoke all on function public.update_collaborator(uuid,text,text,public.collaborator_status,text) from public;
grant execute on function public.update_collaborator(uuid,text,text,public.collaborator_status,text) to authenticated;
