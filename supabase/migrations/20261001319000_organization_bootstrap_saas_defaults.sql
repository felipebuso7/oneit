create or replace function public.bootstrap_organization(
  target_user_id uuid, target_email text, target_full_name text, organization_legal_name text, organization_display_name text
) returns uuid language plpgsql security definer set search_path=public as $$
declare created_organization_id uuid;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'ORGANIZATION_BOOTSTRAP_NOT_AUTHORIZED'; end if;
  if not exists (select 1 from auth.users where id = target_user_id) then raise exception 'The target user must exist in auth.users.'; end if;
  insert into public.organizations(legal_name,display_name) values(trim(organization_legal_name),trim(organization_display_name)) returning id into created_organization_id;
  insert into public.user_profiles(id,full_name,email) values(target_user_id,trim(target_full_name),lower(trim(target_email))) on conflict(id) do update set full_name=excluded.full_name,email=excluded.email;
  insert into public.user_roles(user_id,organization_id,role) values(target_user_id,created_organization_id,'SUPER_ADMIN') on conflict do nothing;
  insert into public.organization_saas_settings(organization_id,created_by,updated_by) values(created_organization_id,target_user_id,target_user_id);
  insert into public.ticket_priority_policies(organization_id,impact,urgency,priority) values
    (created_organization_id,'HIGH','HIGH',1),(created_organization_id,'HIGH','MEDIUM',2),(created_organization_id,'HIGH','LOW',3),
    (created_organization_id,'MEDIUM','HIGH',2),(created_organization_id,'MEDIUM','MEDIUM',3),(created_organization_id,'MEDIUM','LOW',4),
    (created_organization_id,'LOW','HIGH',3),(created_organization_id,'LOW','MEDIUM',4),(created_organization_id,'LOW','LOW',5);
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
  values(created_organization_id,target_user_id,'ORGANIZATION_BOOTSTRAPPED','organization',created_organization_id,
    jsonb_build_object('saas_settings_initialized',true,'priority_matrix_initialized',true),'SERVER');
  return created_organization_id;
end;
$$;
revoke all on function public.bootstrap_organization(uuid,text,text,text,text) from public,authenticated,anon;
grant execute on function public.bootstrap_organization(uuid,text,text,text,text) to service_role;
