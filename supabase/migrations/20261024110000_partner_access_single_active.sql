-- Mantém apenas um acesso externo ativo por OS. A emissão de um novo link
-- invalida imediatamente os links anteriores daquela ordem.
create or replace function public.create_service_order_partner_access(target_service_order_id uuid,target_supplier_id uuid default null,target_valid_for_minutes integer default 480)
returns table(access_id uuid,access_token text,access_code text)
language plpgsql security definer set search_path=public as $$
declare order_record public.service_orders%rowtype; raw_token text; raw_code text;
begin
  select * into order_record from public.service_orders where id=target_service_order_id for update;
  if order_record.id is null or not public.has_organization_role(order_record.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]) then raise exception 'PARTNER_ACCESS_NOT_AUTHORIZED'; end if;
  if order_record.status in('COMPLETED','VALIDATED','CANCELLED') then raise exception 'PARTNER_ACCESS_INVALID_ORDER_STATE'; end if;
  if target_valid_for_minutes not between 15 and 10080 then raise exception 'PARTNER_ACCESS_INVALID_EXPIRY'; end if;
  update public.service_order_partner_accesses
     set revoked_at=clock_timestamp()
   where service_order_id=order_record.id and revoked_at is null and expires_at > clock_timestamp();
  raw_token := encode(gen_random_bytes(24),'hex');
  raw_code := lpad((floor(random()*1000000))::text,6,'0');
  insert into public.service_order_partner_accesses(organization_id,service_order_id,supplier_id,token_hash,access_code_hash,expires_at,created_by)
  values(order_record.organization_id,order_record.id,target_supplier_id,encode(sha256(convert_to(raw_token, 'UTF8')),'hex'),encode(sha256(convert_to(raw_code, 'UTF8')),'hex'),clock_timestamp() + make_interval(mins => target_valid_for_minutes),auth.uid())
  returning id into access_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
  values(order_record.organization_id,auth.uid(),'SERVICE_ORDER_PARTNER_ACCESS_CREATED','service_order_partner_access',access_id,jsonb_build_object('service_order_id',order_record.id,'expires_in_minutes',target_valid_for_minutes),'WEB');
  access_token := raw_token; access_code := raw_code; return next;
end; $$;

revoke all on function public.create_service_order_partner_access(uuid,uuid,integer) from public;
grant execute on function public.create_service_order_partner_access(uuid,uuid,integer) to authenticated;
