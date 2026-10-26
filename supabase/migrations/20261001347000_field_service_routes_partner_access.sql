create extension if not exists pgcrypto;

create table public.field_service_routes(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  technician_id uuid not null references public.technicians(id) on delete restrict,
  route_date date not null,
  status text not null default 'PLANNED' check(status in('PLANNED','IN_PROGRESS','COMPLETED','CANCELLED')),
  start_location jsonb not null default '{}'::jsonb,
  end_location jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.user_profiles(id) on delete set null,
  unique(organization_id,technician_id,route_date)
);

create table public.field_service_route_stops(
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.field_service_routes(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  service_order_id uuid not null references public.service_orders(id) on delete restrict,
  sequence_number smallint not null check(sequence_number between 1 and 999),
  planned_start_at timestamptz,
  planned_end_at timestamptz,
  travel_started_at timestamptz,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  check_in_location jsonb,
  check_out_location jsonb,
  created_at timestamptz not null default now(),
  unique(route_id,sequence_number),
  unique(service_order_id)
);

create table public.service_order_partner_accesses(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  service_order_id uuid not null references public.service_orders(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete set null,
  token_hash text not null unique,
  access_code_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_validated_at timestamptz,
  validation_count integer not null default 0 check(validation_count >= 0),
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete set null,
  check(expires_at > created_at)
);

create table public.service_order_partner_submissions(
  id uuid primary key default gen_random_uuid(),
  partner_access_id uuid not null references public.service_order_partner_accesses(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  checked_in_at timestamptz,
  checked_in_location jsonb,
  checked_out_at timestamptz,
  checked_out_location jsonb,
  execution_report text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  check(execution_report is null or length(trim(execution_report)) between 10 and 10000)
);

create index field_service_routes_technician_date_idx on public.field_service_routes(organization_id,technician_id,route_date);
create index field_service_route_stops_route_idx on public.field_service_route_stops(route_id,sequence_number);
create index service_order_partner_access_order_idx on public.service_order_partner_accesses(service_order_id,expires_at);

create trigger field_service_routes_updated before update on public.field_service_routes for each row execute function public.set_updated_at();

alter table public.field_service_routes enable row level security;
alter table public.field_service_route_stops enable row level security;
alter table public.service_order_partner_accesses enable row level security;
alter table public.service_order_partner_submissions enable row level security;

create policy "members read field routes" on public.field_service_routes for select to authenticated using(public.is_organization_member(organization_id));
create policy "dispatchers manage field routes" on public.field_service_routes for all to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[])) with check(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]));
create policy "members read route stops" on public.field_service_route_stops for select to authenticated using(public.is_organization_member(organization_id));
create policy "dispatchers manage route stops" on public.field_service_route_stops for all to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[])) with check(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]));
create policy "dispatchers read partner access" on public.service_order_partner_accesses for select to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]));
create policy "dispatchers read partner submissions" on public.service_order_partner_submissions for select to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]));

create or replace function public.create_service_order_partner_access(target_service_order_id uuid,target_supplier_id uuid default null,target_valid_for_minutes integer default 480)
returns table(access_id uuid,access_token text,access_code text)
language plpgsql security definer set search_path=public as $$
declare order_record public.service_orders%rowtype; raw_token text; raw_code text;
begin
  select * into order_record from public.service_orders where id=target_service_order_id for update;
  if order_record.id is null or not public.has_organization_role(order_record.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]) then raise exception 'PARTNER_ACCESS_NOT_AUTHORIZED'; end if;
  if order_record.status in('COMPLETED','VALIDATED','CANCELLED') then raise exception 'PARTNER_ACCESS_INVALID_ORDER_STATE'; end if;
  if target_valid_for_minutes not between 15 and 10080 then raise exception 'PARTNER_ACCESS_INVALID_EXPIRY'; end if;
  raw_token := encode(gen_random_bytes(24),'hex');
  raw_code := lpad((floor(random()*1000000))::text,6,'0');
  insert into public.service_order_partner_accesses(organization_id,service_order_id,supplier_id,token_hash,access_code_hash,expires_at,created_by)
  values(order_record.organization_id,order_record.id,target_supplier_id,encode(sha256(convert_to(raw_token, 'UTF8')),'hex'),encode(sha256(convert_to(raw_code, 'UTF8')),'hex'),clock_timestamp() + make_interval(mins => target_valid_for_minutes),auth.uid())
  returning id into access_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
  values(order_record.organization_id,auth.uid(),'SERVICE_ORDER_PARTNER_ACCESS_CREATED','service_order_partner_access',access_id,jsonb_build_object('service_order_id',order_record.id,'expires_in_minutes',target_valid_for_minutes),'WEB');
  access_token := raw_token; access_code := raw_code; return next;
end; $$;

create or replace function public.revoke_service_order_partner_access(target_access_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare access_record public.service_order_partner_accesses%rowtype;
begin
  select * into access_record from public.service_order_partner_accesses where id=target_access_id for update;
  if access_record.id is null or not public.has_organization_role(access_record.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]) then raise exception 'PARTNER_ACCESS_NOT_AUTHORIZED'; end if;
  if access_record.revoked_at is null then
    update public.service_order_partner_accesses set revoked_at=clock_timestamp() where id=access_record.id;
    insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,source) values(access_record.organization_id,auth.uid(),'SERVICE_ORDER_PARTNER_ACCESS_REVOKED','service_order_partner_access',access_record.id,'WEB');
  end if;
end; $$;

revoke all on function public.create_service_order_partner_access(uuid,uuid,integer),public.revoke_service_order_partner_access(uuid) from public;
grant execute on function public.create_service_order_partner_access(uuid,uuid,integer),public.revoke_service_order_partner_access(uuid) to authenticated;
