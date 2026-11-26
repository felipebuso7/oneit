create table if not exists public.organization_email_settings(
  organization_id uuid primary key references public.organizations(id) on delete restrict,
  provider text not null default 'RESEND' check(provider in ('RESEND','GMAIL')),
  from_email text check(from_email is null or from_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  status text not null default 'DISCONNECTED' check(status in ('DISCONNECTED','CONNECTED','ERROR')),
  connected_at timestamptz,
  last_error text check(last_error is null or length(last_error) <= 500),
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.user_profiles(id) on delete set null
);
create index if not exists organization_email_settings_status_idx on public.organization_email_settings(status);
create trigger organization_email_settings_updated before update on public.organization_email_settings for each row execute function public.set_updated_at();
alter table public.organization_email_settings enable row level security;
drop policy if exists "members read organization email settings" on public.organization_email_settings;
create policy "members read organization email settings" on public.organization_email_settings for select to authenticated using(public.is_organization_member(organization_id));
drop policy if exists "admins manage organization email settings" on public.organization_email_settings;
create policy "admins manage organization email settings" on public.organization_email_settings for all to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])) with check(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
create or replace function public.set_organization_email_settings(target_organization_id uuid, target_provider text, target_from_email text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then raise exception 'EMAIL_SETTINGS_NOT_AUTHORIZED'; end if;
  if target_provider not in ('RESEND','GMAIL') then raise exception 'EMAIL_SETTINGS_INVALID_PROVIDER'; end if;
  if target_from_email is not null and target_from_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'EMAIL_SETTINGS_INVALID_FROM'; end if;
  insert into public.organization_email_settings(organization_id,provider,from_email,status,created_by,updated_by)
  values(target_organization_id,target_provider,nullif(trim(target_from_email),''),'DISCONNECTED',auth.uid(),auth.uid())
  on conflict(organization_id) do update set provider=excluded.provider,from_email=excluded.from_email,updated_by=auth.uid();
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
  values(target_organization_id,auth.uid(),'ORGANIZATION_EMAIL_SETTINGS_SET','organization_email_settings',target_organization_id,jsonb_build_object('provider',target_provider,'from_email',nullif(trim(target_from_email),'')),'WEB');
end;
$$;
revoke all on function public.set_organization_email_settings(uuid,text,text) from public;
grant execute on function public.set_organization_email_settings(uuid,text,text) to authenticated;
