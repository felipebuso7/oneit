create table public.organization_saas_settings(
  organization_id uuid primary key references public.organizations(id) on delete restrict,
  locale text not null default 'pt-BR' check(locale ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  timezone text not null default 'America/Sao_Paulo' check(length(timezone) between 3 and 80),
  primary_color text check(primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text check(secondary_color is null or secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  logo_path text check(logo_path is null or logo_path ~ '^[a-z0-9-]+/[A-Za-z0-9_./-]+$'),
  report_logo_path text check(report_logo_path is null or report_logo_path ~ '^[a-z0-9-]+/[A-Za-z0-9_./-]+$'),
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.user_profiles(id) on delete set null
);
create trigger organization_saas_settings_updated before update on public.organization_saas_settings for each row execute function public.set_updated_at();
alter table public.organization_saas_settings enable row level security;
create policy "members read organization saas settings" on public.organization_saas_settings for select to authenticated using(public.is_organization_member(organization_id));
create policy "admins manage organization saas settings" on public.organization_saas_settings for all to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])) with check(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));

create or replace function public.set_organization_saas_settings(
  target_organization_id uuid,
  target_locale text,
  target_timezone text,
  target_primary_color text default null,
  target_secondary_color text default null
)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then
    raise exception 'SAAS_SETTINGS_NOT_AUTHORIZED';
  end if;
  if target_locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' or length(target_timezone) not between 3 and 80 then
    raise exception 'SAAS_SETTINGS_INVALID_LOCALE_OR_TIMEZONE';
  end if;
  if target_primary_color is not null and target_primary_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'SAAS_SETTINGS_INVALID_PRIMARY_COLOR'; end if;
  if target_secondary_color is not null and target_secondary_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'SAAS_SETTINGS_INVALID_SECONDARY_COLOR'; end if;
  insert into public.organization_saas_settings(organization_id,locale,timezone,primary_color,secondary_color,created_by,updated_by)
  values(target_organization_id,trim(target_locale),trim(target_timezone),target_primary_color,target_secondary_color,auth.uid(),auth.uid())
  on conflict(organization_id) do update set locale=excluded.locale,timezone=excluded.timezone,primary_color=excluded.primary_color,secondary_color=excluded.secondary_color,updated_by=auth.uid();
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
  values(target_organization_id,auth.uid(),'ORGANIZATION_SAAS_SETTINGS_SET','organization_saas_settings',target_organization_id,
    jsonb_build_object('locale',trim(target_locale),'timezone',trim(target_timezone),'primary_color',target_primary_color,'secondary_color',target_secondary_color),'WEB');
end;
$$;
revoke all on function public.set_organization_saas_settings(uuid,text,text,text,text) from public;
grant execute on function public.set_organization_saas_settings(uuid,text,text,text,text) to authenticated;
