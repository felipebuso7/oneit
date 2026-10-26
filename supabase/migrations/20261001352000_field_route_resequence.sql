alter table public.field_service_route_stops drop constraint field_service_route_stops_route_id_sequence_number_key;
alter table public.field_service_route_stops add constraint field_service_route_stops_route_sequence_unique unique(route_id,sequence_number) deferrable initially immediate;

create or replace function public.resequence_field_service_route(target_route_id uuid,target_stop_ids uuid[])
returns void language plpgsql security definer set search_path=public as $$
declare route_record public.field_service_routes%rowtype; expected_count integer; received_count integer;
begin
  select * into route_record from public.field_service_routes where id=target_route_id for update;
  if route_record.id is null or not public.has_organization_role(route_record.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]) then raise exception 'FIELD_ROUTE_NOT_AUTHORIZED'; end if;
  if route_record.status in('COMPLETED','CANCELLED') then raise exception 'FIELD_ROUTE_INVALID_STATE'; end if;
  select count(*) into expected_count from public.field_service_route_stops where route_id=route_record.id;
  received_count:=coalesce(cardinality(target_stop_ids),0);
  if expected_count<>received_count or received_count<>cardinality(array(select distinct unnest(target_stop_ids))) then raise exception 'FIELD_ROUTE_INVALID_SEQUENCE'; end if;
  if exists(select 1 from unnest(target_stop_ids) as requested_stop(id) left join public.field_service_route_stops actual on actual.id=requested_stop.id and actual.route_id=route_record.id where actual.id is null) then raise exception 'FIELD_ROUTE_STOP_MISMATCH'; end if;
  set constraints field_service_route_stops_route_sequence_unique deferred;
  update public.field_service_route_stops stop set sequence_number=ordered.position::smallint
  from unnest(target_stop_ids) with ordinality as ordered(id,position)
  where stop.id=ordered.id and stop.route_id=route_record.id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
  values(route_record.organization_id,auth.uid(),'FIELD_ROUTE_RESEQUENCED','field_service_route',route_record.id,jsonb_build_object('stop_ids',target_stop_ids),'WEB');
end; $$;

revoke all on function public.resequence_field_service_route(uuid,uuid[]) from public;
grant execute on function public.resequence_field_service_route(uuid,uuid[]) to authenticated;
