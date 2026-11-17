-- Administrador Master pode retirar chamados de teste mesmo após a execução.
-- A operação cancela também as OS vinculadas para que não apareçam em despacho,
-- validação, RTO ou medição. O histórico de auditoria permanece preservado.
create or replace function public.cancel_ticket(target_ticket_id uuid, expected_version integer, target_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare ticket_row public.tickets%rowtype; is_master boolean;
begin
  select * into ticket_row from public.tickets where id = target_ticket_id for update;
  if ticket_row.id is null or not public.has_ticket_management_role(ticket_row.organization_id) then raise exception 'TICKET_NOT_AUTHORIZED'; end if;
  if ticket_row.version <> expected_version then raise exception 'TICKET_VERSION_CONFLICT'; end if;
  is_master := public.has_organization_role(ticket_row.organization_id, array['SUPER_ADMIN']::public.platform_role[]);
  if ticket_row.administrative_status = 'CLOSED' and not is_master then raise exception 'TICKET_CLOSED_MASTER_ONLY'; end if;
  if not is_master and ticket_row.operational_status not in ('NEW','TRIAGE','AWAITING_SCHEDULING','SCHEDULED','ASSIGNED','PENDING_CUSTOMER','PENDING_ACCESS','PENDING_MATERIAL','PENDING_THIRD_PARTY','PENDING_CLIENT_IT','WAITING_AUTHORIZATION','RESCHEDULED') then raise exception 'TICKET_CANCEL_NOT_ALLOWED'; end if;
  update public.service_orders set status = 'CANCELLED', updated_at = clock_timestamp(), updated_by = auth.uid() where ticket_id = ticket_row.id;
  update public.tickets set operational_status = 'CANCELLED', version = version + 1, updated_at = clock_timestamp() where id = ticket_row.id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(ticket_row.organization_id,auth.uid(),'TICKET_CANCELLED','ticket',ticket_row.id,jsonb_build_object('reason',nullif(trim(target_reason),''),'master_override',is_master,'service_orders_cancelled',true),'WEB');
end; $$;
revoke all on function public.cancel_ticket(uuid, integer, text) from public;
grant execute on function public.cancel_ticket(uuid, integer, text) to authenticated;
