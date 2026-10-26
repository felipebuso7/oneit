create table public.announcements(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  title text not null check(length(trim(title)) between 3 and 160),
  message text not null check(length(trim(message)) between 3 and 5000),
  severity text not null default 'INFO' check(severity in ('INFO','ATTENTION','IMPORTANT','CRITICAL')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  requires_acknowledgement boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.user_profiles(id) on delete set null,
  check(ends_at > starts_at)
);
create index announcements_visible_idx on public.announcements(organization_id,active,starts_at,ends_at);
create trigger announcements_updated before update on public.announcements for each row execute function public.set_updated_at();

create table public.announcement_acknowledgements(
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references public.user_profiles(id) on delete restrict,
  acknowledged_at timestamptz not null default now(),
  unique(announcement_id,user_id)
);
create index announcement_acknowledgements_user_idx on public.announcement_acknowledgements(user_id,organization_id);

alter table public.announcements enable row level security;
alter table public.announcement_acknowledgements enable row level security;
create policy "members read current announcements" on public.announcements for select to authenticated using(
  public.is_organization_member(organization_id) and (
    (active and starts_at <= now() and ends_at > now()) or
    public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])
  )
);
create policy "admins manage announcements" on public.announcements for all to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])) with check(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
create policy "users read own announcement acknowledgements" on public.announcement_acknowledgements for select to authenticated using(user_id=auth.uid() or public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));

create or replace function public.create_announcement(target_organization_id uuid,target_title text,target_message text,target_severity text,target_starts_at timestamptz,target_ends_at timestamptz,target_requires_acknowledgement boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare announcement_id uuid;
begin
  if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then raise exception 'ANNOUNCEMENT_NOT_AUTHORIZED'; end if;
  if length(trim(target_title)) not between 3 and 160 or length(trim(target_message)) not between 3 and 5000 or target_severity not in ('INFO','ATTENTION','IMPORTANT','CRITICAL') or target_ends_at <= target_starts_at then raise exception 'ANNOUNCEMENT_INVALID_INPUT'; end if;
  insert into public.announcements(organization_id,title,message,severity,starts_at,ends_at,requires_acknowledgement,created_by,updated_by)
  values(target_organization_id,trim(target_title),trim(target_message),target_severity,target_starts_at,target_ends_at,target_requires_acknowledgement,auth.uid(),auth.uid()) returning id into announcement_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
  values(target_organization_id,auth.uid(),'ANNOUNCEMENT_CREATED','announcement',announcement_id,jsonb_build_object('severity',target_severity,'requires_acknowledgement',target_requires_acknowledgement),'WEB');
  return announcement_id;
end;
$$;

create or replace function public.acknowledge_announcement(target_announcement_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare announcement_record public.announcements%rowtype;
begin
  select * into announcement_record from public.announcements where id=target_announcement_id for update;
  if not found or not announcement_record.active or announcement_record.starts_at > now() or announcement_record.ends_at <= now() or not public.is_organization_member(announcement_record.organization_id) then raise exception 'ANNOUNCEMENT_NOT_AVAILABLE'; end if;
  insert into public.announcement_acknowledgements(announcement_id,organization_id,user_id) values(announcement_record.id,announcement_record.organization_id,auth.uid()) on conflict(announcement_id,user_id) do nothing;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,source) values(announcement_record.organization_id,auth.uid(),'ANNOUNCEMENT_ACKNOWLEDGED','announcement',announcement_record.id,'WEB');
end;
$$;
revoke all on function public.create_announcement(uuid,text,text,text,timestamptz,timestamptz,boolean),public.acknowledge_announcement(uuid) from public;
grant execute on function public.create_announcement(uuid,text,text,text,timestamptz,timestamptz,boolean),public.acknowledge_announcement(uuid) to authenticated;
