-- Dimensões fiscais do BM. Os valores são snapshots da OS no momento da medição,
-- evitando que alterações cadastrais futuras mudem uma cobrança já gerada.
alter table public.measurement_sheet_lines
  add column if not exists competence date,
  add column if not exists customer_id uuid references public.customers(id) on delete restrict,
  add column if not exists contract_id uuid references public.contracts(id) on delete restrict,
  add column if not exists location_id uuid references public.customer_locations(id) on delete restrict,
  add column if not exists department_unit_id uuid references public.organization_units(id) on delete restrict,
  add column if not exists service_offering_id uuid references public.service_offerings(id) on delete restrict;

alter table public.measurement_sheet_lines
  add constraint measurement_lines_competence_month_start
  check (competence is null or date_trunc('month', competence)::date = competence);

create index if not exists measurement_lines_dimensions_idx
  on public.measurement_sheet_lines(measurement_sheet_id, customer_id, contract_id, location_id, department_unit_id, service_offering_id, competence);

-- Preenche as dimensões ausentes em BMs antigos sem alterar valores financeiros.
update public.measurement_sheet_lines l
set competence = coalesce(l.competence, date_trunc('month', l.service_date)::date),
    customer_id = coalesce(l.customer_id, t.customer_id),
    contract_id = coalesce(l.contract_id, t.contract_id),
    location_id = coalesce(l.location_id, so.location_id, t.location_id),
    department_unit_id = coalesce(l.department_unit_id, t.department_unit_id),
    service_offering_id = coalesce(l.service_offering_id, t.service_offering_id)
from public.tickets t
left join public.service_orders so on so.ticket_id = t.id
where l.ticket_id = t.id;

create or replace function public.generate_field_service_measurement(
  target_organization_id uuid,
  target_competence date,
  target_actor uuid default null
) returns public.measurement_sheets
language plpgsql security definer set search_path = public as $$
declare
  period_record public.billing_periods%rowtype;
  sheet_record public.measurement_sheets%rowtype;
  effective_actor uuid := auth.uid();
  period_end date;
  eligible_count integer;
  line_count integer;
  next_sheet_number text;
begin
  if effective_actor is null or target_actor is distinct from effective_actor then raise exception 'measurement_generation_forbidden'; end if;
  if date_trunc('month', target_competence)::date <> target_competence then raise exception 'measurement_competence_must_be_month_start'; end if;
  if not public.has_organization_role(target_organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]) then raise exception 'measurement_generation_forbidden'; end if;
  period_end := (target_competence + interval '1 month')::date;
  insert into public.billing_periods(organization_id, competence) values (target_organization_id, target_competence) on conflict (organization_id, competence) do nothing;
  select * into period_record from public.billing_periods where organization_id = target_organization_id and competence = target_competence for update;
  if period_record.status not in ('DRAFT','RETURNED_FOR_CORRECTION') then raise exception 'measurement_generation_invalid_state'; end if;
  select * into sheet_record from public.measurement_sheets where billing_period_id = period_record.id for update;
  if sheet_record.id is not null then return sheet_record; end if;
  select count(*) into eligible_count from public.field_service_ticket_closures closure join public.service_orders so on so.id=closure.service_order_id join public.tickets t on t.id=closure.ticket_id where closure.organization_id=target_organization_id and closure.closed_at>=target_competence and closure.closed_at<period_end and so.status='VALIDATED' and t.administrative_status='CLOSED';
  if eligible_count=0 then raise exception 'measurement_no_closed_field_service_orders'; end if;
  select count(*) into line_count from public.field_service_ticket_closures closure join public.service_orders so on so.id=closure.service_order_id and so.status='VALIDATED' join public.tickets t on t.id=closure.ticket_id and t.administrative_status='CLOSED' join public.field_service_order_lpu_lines l on l.service_order_id=so.id where closure.organization_id=target_organization_id and closure.closed_at>=target_competence and closure.closed_at<period_end;
  if line_count=0 then raise exception 'measurement_no_lpu_lines'; end if;
  next_sheet_number := 'BM-' || to_char(target_competence, 'YYYY-MM');
  insert into public.measurement_sheets(billing_period_id, organization_id, sheet_number, total_orders, total_amount) values(period_record.id,target_organization_id,next_sheet_number,0,0) returning * into sheet_record;
  insert into public.measurement_sheet_lines(measurement_sheet_id,ticket_id,ticket_number,lpu_code,description,quantity,unit_price,snapshot,line_kind,source_reference,service_date,service_location,order_reference,competence,customer_id,contract_id,location_id,department_unit_id,service_offering_id)
  select sheet_record.id,closure.ticket_id,t.ticket_number,l.lpu_code,l.description,l.quantity,l.unit_price,jsonb_build_object('service_order_id',so.id,'order_number',so.order_number,'rto_report_id',closure.report_id,'customer_id',t.customer_id,'contract_id',t.contract_id,'location_id',coalesce(so.location_id,t.location_id),'department_unit_id',t.department_unit_id,'service_offering_id',t.service_offering_id),'LPU',closure.report_id::text,closure.closed_at::date,concat_ws(', ',nullif(trim(loc.street||' '||coalesce(loc.street_number,'')),''),nullif(trim(loc.city),'')),so.order_number,target_competence,t.customer_id,t.contract_id,coalesce(so.location_id,t.location_id),t.department_unit_id,t.service_offering_id
  from public.field_service_ticket_closures closure join public.service_orders so on so.id=closure.service_order_id and so.status='VALIDATED' join public.tickets t on t.id=closure.ticket_id and t.administrative_status='CLOSED' join public.field_service_order_lpu_lines l on l.service_order_id=so.id left join public.customer_locations loc on loc.id=coalesce(so.location_id,t.location_id) where closure.organization_id=target_organization_id and closure.closed_at>=target_competence and closure.closed_at<period_end;
  update public.measurement_sheets set total_orders=(select count(distinct ticket_id) from public.measurement_sheet_lines where measurement_sheet_id=sheet_record.id),total_amount=(select coalesce(sum(total_price),0) from public.measurement_sheet_lines where measurement_sheet_id=sheet_record.id) where id=sheet_record.id returning * into sheet_record;
  insert into public.measurement_sheet_summary(measurement_sheet_id,lpu_code,description,order_count,total_quantity,total_amount) select measurement_sheet_id,lpu_code,description,count(distinct ticket_id),sum(quantity),sum(total_price) from public.measurement_sheet_lines where measurement_sheet_id=sheet_record.id group by measurement_sheet_id,lpu_code,description;
  insert into public.measurement_sheet_versions(measurement_sheet_id,billing_period_id,organization_id,version,status,total_orders,total_amount,calculation_hash,snapshot) values(sheet_record.id,period_record.id,target_organization_id,1,'DRAFT',sheet_record.total_orders,sheet_record.total_amount,md5(sheet_record.id::text||':'||sheet_record.total_amount::text),jsonb_build_object('source','FIELD_SERVICE_CLOSURES','competence',target_competence,'generated_at',clock_timestamp()));
  insert into public.measurement_sheet_events(measurement_sheet_id,organization_id,event_type,actor_id,metadata) values(sheet_record.id,target_organization_id,'CREATED',effective_actor,jsonb_build_object('source','FIELD_SERVICE_CLOSURES','eligible_orders',eligible_count));
  return sheet_record;
end; $$;

revoke all on function public.generate_field_service_measurement(uuid,date,uuid) from public, anon;
grant execute on function public.generate_field_service_measurement(uuid,date,uuid) to authenticated;
