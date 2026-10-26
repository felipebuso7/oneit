create table public.email_templates(
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  template_key text not null check(template_key ~ '^[a-z][a-z0-9_]{2,79}$'), subject text not null check(length(trim(subject)) between 3 and 240),
  body_text text not null check(length(trim(body_text)) between 3 and 12000), version_number integer not null default 1 check(version_number > 0), active boolean not null default true,
  created_at timestamptz not null default now(), created_by uuid references public.user_profiles(id) on delete set null,
  updated_at timestamptz not null default now(), updated_by uuid references public.user_profiles(id) on delete set null,
  unique(organization_id,template_key)
);
create table public.email_template_versions(
  id uuid primary key default gen_random_uuid(), template_id uuid not null references public.email_templates(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict, version_number integer not null,
  subject text not null, body_text text not null, created_at timestamptz not null default now(), created_by uuid references public.user_profiles(id) on delete set null,
  unique(template_id,version_number)
);
create trigger email_templates_updated before update on public.email_templates for each row execute function public.set_updated_at();
alter table public.email_templates enable row level security; alter table public.email_template_versions enable row level security;
create policy "admins read email templates" on public.email_templates for select to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
create policy "admins read email template versions" on public.email_template_versions for select to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));

create or replace function public.validate_email_template_text(value text) returns boolean language plpgsql immutable set search_path=public as $$
declare variable_name text;
begin
  if value ~* '<\\s*script' or value ~* 'javascript\\s*:' then return false; end if;
  for variable_name in select (match)[1] from regexp_matches(value, '\\{\\{\\s*([^{}[:space:]]+)\\s*\\}\\}', 'g') as match loop
    if variable_name not in ('requester.name','ticket.number','ticket.category','ticket.status','organization.name') then return false; end if;
  end loop;
  return value !~ '\\{\\{' or value ~ '\\{\\{\\s*[^{}[:space:]]+\\s*\\}\\}';
end;
$$;

create or replace function public.save_email_template(target_organization_id uuid,target_template_key text,target_subject text,target_body_text text)
returns uuid language plpgsql security definer set search_path=public as $$
declare template_id uuid; next_version integer;
begin
  if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then raise exception 'EMAIL_TEMPLATE_NOT_AUTHORIZED'; end if;
  if trim(target_template_key) !~ '^[a-z][a-z0-9_]{2,79}$' or length(trim(target_subject)) not between 3 and 240 or length(trim(target_body_text)) not between 3 and 12000 or not public.validate_email_template_text(target_subject) or not public.validate_email_template_text(target_body_text) then raise exception 'EMAIL_TEMPLATE_INVALID_INPUT'; end if;
  select id,version_number+1 into template_id,next_version from public.email_templates where organization_id=target_organization_id and template_key=trim(target_template_key) for update;
  if template_id is null then
    next_version:=1;
    insert into public.email_templates(organization_id,template_key,subject,body_text,version_number,created_by,updated_by) values(target_organization_id,trim(target_template_key),trim(target_subject),trim(target_body_text),next_version,auth.uid(),auth.uid()) returning id into template_id;
  else
    update public.email_templates set subject=trim(target_subject),body_text=trim(target_body_text),version_number=next_version,updated_by=auth.uid() where id=template_id;
  end if;
  insert into public.email_template_versions(template_id,organization_id,version_number,subject,body_text,created_by) values(template_id,target_organization_id,next_version,trim(target_subject),trim(target_body_text),auth.uid());
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(target_organization_id,auth.uid(),'EMAIL_TEMPLATE_VERSION_SAVED','email_template',template_id,jsonb_build_object('key',trim(target_template_key),'version',next_version),'WEB');
  return template_id;
end;
$$;
revoke all on function public.save_email_template(uuid,text,text,text) from public;
grant execute on function public.save_email_template(uuid,text,text,text) to authenticated;
