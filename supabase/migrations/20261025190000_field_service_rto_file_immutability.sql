-- Evita substituir silenciosamente o arquivo final de RTO já registrado.
create or replace function public.register_field_service_rto_file(target_report_id uuid, target_storage_path text, target_sha256 text)
returns void language plpgsql security definer set search_path = public as $$
declare report public.field_service_rto_reports%rowtype;
begin
  select * into report from public.field_service_rto_reports where id = target_report_id for update;
  if report.id is null
    or not public.has_organization_role(report.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[])
    or not exists (select 1 from public.user_profiles where id = auth.uid() and active) then raise exception 'RTO_NOT_AUTHORIZED'; end if;
  if target_storage_path is null or target_storage_path not like report.organization_id::text || '/field-service/' || report.service_order_id::text || '/rto-v%.pdf' then raise exception 'RTO_PATH_INVALID'; end if;
  if target_sha256 is null or target_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'RTO_HASH_INVALID'; end if;
  if report.storage_path is not null and (report.storage_path <> target_storage_path or report.sha256 is distinct from target_sha256) then
    raise exception 'RTO_FILE_ALREADY_REGISTERED';
  end if;
  update public.field_service_rto_reports set storage_path = target_storage_path, sha256 = target_sha256 where id = report.id;
end;
$$;

revoke all on function public.register_field_service_rto_file(uuid, text, text) from public;
grant execute on function public.register_field_service_rto_file(uuid, text, text) to authenticated;
