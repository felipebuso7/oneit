-- Completa o ciclo de manutenção de solicitantes sem abrir UPDATE direto no RLS.
-- A função preserva a auditoria e valida o escopo da organização.
create or replace function public.update_collaborator(
  target_collaborator_id uuid,
  target_employee_number text,
  target_full_name text,
  target_status public.collaborator_status default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare item public.collaborators%rowtype;
begin
  select * into item from public.collaborators where id = target_collaborator_id for update;
  if item.id is null or not public.has_organization_role(item.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]) then
    raise exception 'COLLABORATOR_NOT_AUTHORIZED';
  end if;
  if coalesce(length(trim(target_employee_number)), 0) not between 1 and 100 or coalesce(length(trim(target_full_name)), 0) not between 2 and 240 then
    raise exception 'COLLABORATOR_INVALID_INPUT';
  end if;
  update public.collaborators
     set employee_number = trim(target_employee_number),
         full_name = trim(target_full_name),
         status = coalesce(target_status, status),
         updated_at = now()
   where id = item.id;
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values (item.organization_id, auth.uid(), 'COLLABORATOR_UPDATED', 'collaborator', item.id,
          jsonb_build_object('employee_number', trim(target_employee_number), 'status', coalesce(target_status, item.status)), 'WEB');
  return item.id;
end;
$$;

revoke all on function public.update_collaborator(uuid, text, text, public.collaborator_status) from public;
grant execute on function public.update_collaborator(uuid, text, text, public.collaborator_status) to authenticated;
