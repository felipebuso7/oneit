create table public.service_calendars (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,79}$'), name text not null check (length(trim(name)) between 2 and 200),
  timezone text not null default 'America/Sao_Paulo', calendar_type text not null check (calendar_type in ('TWENTY_FOUR_SEVEN', 'BUSINESS_HOURS')),
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id, code)
);
create table public.service_calendar_windows (
  id uuid primary key default gen_random_uuid(), calendar_id uuid not null references public.service_calendars(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), starts_at time not null, ends_at time not null, check (ends_at > starts_at), unique(calendar_id, weekday, starts_at, ends_at)
);
create table public.service_calendar_holidays (
  id uuid primary key default gen_random_uuid(), calendar_id uuid not null references public.service_calendars(id) on delete cascade,
  holiday_date date not null, name text not null check (length(trim(name)) between 2 and 200), unique(calendar_id, holiday_date)
);
create trigger service_calendars_updated before update on public.service_calendars for each row execute function public.set_updated_at();
alter table public.service_calendars enable row level security; alter table public.service_calendar_windows enable row level security; alter table public.service_calendar_holidays enable row level security;
create policy "members read service calendars" on public.service_calendars for select to authenticated using (public.is_organization_member(organization_id));
create policy "admins manage service calendars" on public.service_calendars for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
create policy "members read calendar windows" on public.service_calendar_windows for select to authenticated using (exists(select 1 from public.service_calendars c where c.id=calendar_id and public.is_organization_member(c.organization_id)));
create policy "members read calendar holidays" on public.service_calendar_holidays for select to authenticated using (exists(select 1 from public.service_calendars c where c.id=calendar_id and public.is_organization_member(c.organization_id)));

create or replace function public.create_service_calendar(target_organization_id uuid, target_code text, target_name text, target_timezone text, target_type text)
returns uuid language plpgsql security definer set search_path=public as $$
declare calendar_id uuid;
begin
  if not public.has_organization_role(target_organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then raise exception 'CALENDAR_NOT_AUTHORIZED'; end if;
  if target_code !~ '^[A-Z0-9][A-Z0-9_-]{1,79}$' or length(trim(target_name)) not between 2 and 200 or target_type not in ('TWENTY_FOUR_SEVEN','BUSINESS_HOURS') or length(trim(target_timezone)) not between 3 and 100 then raise exception 'CALENDAR_INVALID_INPUT'; end if;
  insert into public.service_calendars(organization_id,code,name,timezone,calendar_type) values(target_organization_id,target_code,trim(target_name),trim(target_timezone),target_type) returning id into calendar_id;
  if target_type='BUSINESS_HOURS' then
    insert into public.service_calendar_windows(calendar_id,weekday,starts_at,ends_at) values
      (calendar_id,1,'08:00','18:00'),(calendar_id,2,'08:00','18:00'),(calendar_id,3,'08:00','18:00'),(calendar_id,4,'08:00','18:00'),(calendar_id,5,'08:00','18:00');
  end if;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(target_organization_id,auth.uid(),'SERVICE_CALENDAR_CREATED','service_calendar',calendar_id,jsonb_build_object('code',target_code,'type',target_type,'timezone',target_timezone),'WEB');
  return calendar_id;
end; $$;
revoke all on function public.create_service_calendar(uuid,text,text,text,text) from public;
grant execute on function public.create_service_calendar(uuid,text,text,text,text) to authenticated;
