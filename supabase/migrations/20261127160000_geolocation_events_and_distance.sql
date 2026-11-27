-- Trilha normalizada de localização operacional. Não representa rastreamento contínuo.
create table if not exists public.service_order_location_events(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  service_order_id uuid not null references public.service_orders(id) on delete restrict,
  partner_access_id uuid references public.service_order_partner_accesses(id) on delete set null,
  event_type text not null check(event_type in ('TRAVEL_STARTED','CHECK_IN','CHECK_OUT')),
  captured_at timestamptz,
  received_at timestamptz not null default clock_timestamp(),
  latitude numeric(9,6), longitude numeric(9,6), accuracy_m numeric(10,2),
  capture_status text not null check(capture_status in ('CAPTURED','UNAVAILABLE')),
  source text not null default 'BROWSER_GEOLOCATION',
  failure_reason text,
  unique(service_order_id, partner_access_id, event_type),
  check((capture_status = 'CAPTURED' and latitude is not null and longitude is not null and accuracy_m is not null and accuracy_m >= 0)
    or (capture_status = 'UNAVAILABLE' and latitude is null and longitude is null))
);
create index if not exists service_order_location_events_order_idx on public.service_order_location_events(service_order_id, event_type, received_at desc);
alter table public.service_order_location_events enable row level security;
drop policy if exists "members read service order locations" on public.service_order_location_events;
create policy "members read service order locations" on public.service_order_location_events for select to authenticated using(public.is_organization_member(organization_id));

create table if not exists public.service_order_travel_metrics(
  service_order_id uuid primary key references public.service_orders(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  travel_started_at timestamptz,
  checked_in_at timestamptz,
  duration_seconds integer check(duration_seconds is null or duration_seconds >= 0),
  straight_line_distance_m integer check(straight_line_distance_m is null or straight_line_distance_m >= 0),
  road_distance_m integer check(road_distance_m is null or road_distance_m >= 0),
  distance_method text not null default 'PENDING_ROAD_ROUTE',
  status text not null default 'PENDING',
  calculated_at timestamptz,
  check(distance_method in ('PENDING_ROAD_ROUTE','STRAIGHT_LINE_ESTIMATE','ROAD_ROUTE_ESTIMATE'))
);
alter table public.service_order_travel_metrics enable row level security;
drop policy if exists "members read service order travel metrics" on public.service_order_travel_metrics;
create policy "members read service order travel metrics" on public.service_order_travel_metrics for select to authenticated using(public.is_organization_member(organization_id));

create or replace function public.record_partner_location_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare access_record public.service_order_partner_accesses%rowtype; order_id uuid; loc jsonb; kind text;
begin
  select * into access_record from public.service_order_partner_accesses where id = new.partner_access_id;
  order_id := access_record.service_order_id;
  if new.checked_in_at is not null then
    loc := new.checked_in_location; kind := 'CHECK_IN';
    insert into public.service_order_location_events(organization_id,service_order_id,partner_access_id,event_type,captured_at,latitude,longitude,accuracy_m,capture_status,failure_reason)
    values(new.organization_id,order_id,new.partner_access_id,kind,new.checked_in_at,(loc->>'latitude')::numeric,(loc->>'longitude')::numeric,(loc->>'accuracy')::numeric,case when loc ? 'latitude' and loc ? 'longitude' then 'CAPTURED' else 'UNAVAILABLE' end,case when loc is null then 'PERMISSION_OR_DEVICE_UNAVAILABLE' else null end)
    on conflict (service_order_id,partner_access_id,event_type) do update set captured_at=excluded.captured_at,latitude=excluded.latitude,longitude=excluded.longitude,accuracy_m=excluded.accuracy_m,capture_status=excluded.capture_status,failure_reason=excluded.failure_reason;
  end if;
  if new.checked_out_at is not null then
    loc := new.checked_out_location; kind := 'CHECK_OUT';
    insert into public.service_order_location_events(organization_id,service_order_id,partner_access_id,event_type,captured_at,latitude,longitude,accuracy_m,capture_status,failure_reason)
    values(new.organization_id,order_id,new.partner_access_id,kind,new.checked_out_at,(loc->>'latitude')::numeric,(loc->>'longitude')::numeric,(loc->>'accuracy')::numeric,case when loc ? 'latitude' and loc ? 'longitude' then 'CAPTURED' else 'UNAVAILABLE' end,case when loc is null then 'PERMISSION_OR_DEVICE_UNAVAILABLE' else null end)
    on conflict (service_order_id,partner_access_id,event_type) do update set captured_at=excluded.captured_at,latitude=excluded.latitude,longitude=excluded.longitude,accuracy_m=excluded.accuracy_m,capture_status=excluded.capture_status,failure_reason=excluded.failure_reason;
  end if;
  return new;
end; $$;
drop trigger if exists partner_submission_location_audit on public.service_order_partner_submissions;
create trigger partner_submission_location_audit after insert or update on public.service_order_partner_submissions for each row execute function public.record_partner_location_event();

create or replace function public.record_partner_travel_start()
returns trigger language plpgsql security definer set search_path=public as $$
declare loc jsonb; access_id uuid;
begin
  if new.event_type <> 'TRAVELING' then return new; end if;
  loc := new.details->'location';
  select id into access_id from public.service_order_partner_accesses where service_order_id=new.service_order_id order by created_at desc limit 1;
  insert into public.service_order_location_events(organization_id,service_order_id,partner_access_id,event_type,captured_at,latitude,longitude,accuracy_m,capture_status,failure_reason)
  values(new.organization_id,new.service_order_id,access_id, 'TRAVEL_STARTED',new.created_at,(loc->>'latitude')::numeric,(loc->>'longitude')::numeric,(loc->>'accuracy')::numeric,case when loc ? 'latitude' and loc ? 'longitude' then 'CAPTURED' else 'UNAVAILABLE' end,case when loc is null or not (loc ? 'latitude') then 'PERMISSION_OR_DEVICE_UNAVAILABLE' else null end)
  on conflict (service_order_id,partner_access_id,event_type) do update set captured_at=excluded.captured_at,latitude=excluded.latitude,longitude=excluded.longitude,accuracy_m=excluded.accuracy_m,capture_status=excluded.capture_status,failure_reason=excluded.failure_reason;
  return new;
end; $$;
drop trigger if exists service_order_travel_location_audit on public.service_order_events;
create trigger service_order_travel_location_audit after insert on public.service_order_events for each row execute function public.record_partner_travel_start();

create or replace function public.refresh_service_order_travel_metrics()
returns trigger language plpgsql security definer set search_path=public as $$
declare start_event public.service_order_location_events%rowtype; arrival_event public.service_order_location_events%rowtype; distance numeric;
begin
  if new.event_type <> 'CHECK_IN' then return new; end if;
  select * into start_event from public.service_order_location_events where service_order_id=new.service_order_id and event_type='TRAVEL_STARTED' order by received_at desc limit 1;
  select * into arrival_event from public.service_order_location_events where service_order_id=new.service_order_id and event_type='CHECK_IN' order by received_at desc limit 1;
  if start_event.captured_at is not null and arrival_event.captured_at is not null then
    distance := 6371008.8 * 2 * asin(sqrt(power(sin(radians((arrival_event.latitude-start_event.latitude)/2)),2)+cos(radians(start_event.latitude))*cos(radians(arrival_event.latitude))*power(sin(radians((arrival_event.longitude-start_event.longitude)/2)),2)));
    insert into public.service_order_travel_metrics(service_order_id,organization_id,travel_started_at,checked_in_at,duration_seconds,straight_line_distance_m,distance_method,status,calculated_at)
    values(new.service_order_id,new.organization_id,start_event.captured_at,arrival_event.captured_at,greatest(0,extract(epoch from arrival_event.captured_at-start_event.captured_at)::integer),round(distance)::integer,'STRAIGHT_LINE_ESTIMATE','CALCULATED',clock_timestamp())
    on conflict(service_order_id) do update set travel_started_at=excluded.travel_started_at,checked_in_at=excluded.checked_in_at,duration_seconds=excluded.duration_seconds,straight_line_distance_m=excluded.straight_line_distance_m,distance_method=excluded.distance_method,status=excluded.status,calculated_at=excluded.calculated_at;
  end if;
  return new;
end; $$;
drop trigger if exists service_order_travel_metrics_refresh on public.service_order_location_events;
create trigger service_order_travel_metrics_refresh after insert or update on public.service_order_location_events for each row execute function public.refresh_service_order_travel_metrics();
