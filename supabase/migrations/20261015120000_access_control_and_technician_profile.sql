create type public.user_visibility_scope as enum ('ALL_LOCATIONS','OWN_ASSIGNMENTS','OWN_LEVEL','SELECTED_LOCATIONS');

create table public.module_definitions (
  module_key text primary key check(module_key in ('OPERATION','SERVICE_MANAGEMENT','FIELD_SERVICE','SGSTI','ADMINISTRATION')),
  label text not null,
  description text not null,
  display_order smallint not null,
  active boolean not null default true
);

create table public.module_permission_definitions (
  permission_key text primary key check(permission_key ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  module_key text not null references public.module_definitions(module_key) on delete restrict,
  label text not null,
  description text not null,
  display_order smallint not null,
  active boolean not null default true
);

create table public.user_module_access (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  module_key text not null references public.module_definitions(module_key) on delete restrict,
  enabled boolean not null default false,
  visibility_scope public.user_visibility_scope not null default 'ALL_LOCATIONS',
  updated_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, user_id, module_key)
);

create table public.user_permission_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  permission_key text not null references public.module_permission_definitions(permission_key) on delete restrict,
  enabled boolean not null default false,
  updated_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, user_id, permission_key)
);

create table public.user_location_access_scopes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  location_id uuid not null references public.customer_locations(id) on delete cascade,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(organization_id, user_id, location_id)
);

alter table public.technicians
  add column employee_identifier text,
  add column job_title text,
  add column mobile text,
  add column hourly_cost numeric(12,2) check(hourly_cost is null or hourly_cost >= 0),
  add column visibility_scope public.user_visibility_scope not null default 'OWN_ASSIGNMENTS',
  add column external_partner_reference text;

create index user_module_access_lookup_idx on public.user_module_access(organization_id, user_id, enabled);
create index user_permission_grants_lookup_idx on public.user_permission_grants(organization_id, user_id, enabled);
create index user_location_access_lookup_idx on public.user_location_access_scopes(organization_id, user_id);
create trigger user_module_access_updated before update on public.user_module_access for each row execute function public.set_updated_at();
create trigger user_permission_grants_updated before update on public.user_permission_grants for each row execute function public.set_updated_at();

alter table public.module_definitions enable row level security;
alter table public.module_permission_definitions enable row level security;
alter table public.user_module_access enable row level security;
alter table public.user_permission_grants enable row level security;
alter table public.user_location_access_scopes enable row level security;

create policy "members read module definitions" on public.module_definitions for select to authenticated using(true);
create policy "members read permission definitions" on public.module_permission_definitions for select to authenticated using(true);
create policy "users read own module access" on public.user_module_access for select to authenticated using(user_id = auth.uid() or public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
create policy "users read own permission grants" on public.user_permission_grants for select to authenticated using(user_id = auth.uid() or public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
create policy "users read own location scope" on public.user_location_access_scopes for select to authenticated using(user_id = auth.uid() or public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));

insert into public.module_definitions(module_key,label,description,display_order) values
  ('OPERATION','Operação','Visão operacional, caixa de entrada e chamados.',10),
  ('SERVICE_MANAGEMENT','Gestão de serviços','Problemas, mudanças, ativos e fornecedores.',20),
  ('FIELD_SERVICE','Field Service','Despacho, rotas, atendimento de campo e ordens de serviço.',30),
  ('SGSTI','SGSTI','Agenda, documentos, auditorias, evidências e melhoria contínua.',40),
  ('ADMINISTRATION','Administração','Configurações, pessoas, permissões e relatórios.',50);

insert into public.module_permission_definitions(permission_key,module_key,label,description,display_order) values
  ('OPERATION_TICKETS_VIEW','OPERATION','Visualizar chamados','Consultar chamados conforme seu escopo.',10),
  ('OPERATION_TICKETS_UPDATE','OPERATION','Atualizar chamados','Registrar atendimento, classificação e comunicação.',20),
  ('FIELD_SERVICE_VIEW','FIELD_SERVICE','Visualizar Field Service','Consultar fila, rotas e ordens do escopo permitido.',10),
  ('FIELD_SERVICE_EXECUTE','FIELD_SERVICE','Executar atendimento de campo','Check-in, check-out, evidências e conclusão técnica.',20),
  ('SERVICE_MANAGEMENT_VIEW','SERVICE_MANAGEMENT','Consultar gestão de serviços','Acessar problemas, mudanças, ativos e fornecedores.',10),
  ('SERVICE_MANAGEMENT_MANAGE','SERVICE_MANAGEMENT','Gerenciar serviços','Criar e alterar processos de gestão de serviços.',20),
  ('SGSTI_VIEW','SGSTI','Consultar SGSTI','Acessar agenda, documentos e auditorias.',10),
  ('SGSTI_EXECUTE','SGSTI','Executar ritos SGSTI','Registrar atas, evidências e andamento de atividades.',20),
  ('SGSTI_AUDIT','SGSTI','Conduzir auditorias','Planejar auditorias e registrar achados.',30),
  ('ADMINISTRATION_USERS','ADMINISTRATION','Gerenciar usuários e técnicos','Criar, editar, ativar e atribuir acessos.',10),
  ('ADMINISTRATION_SETTINGS','ADMINISTRATION','Gerenciar configurações','Alterar catálogos, SLAs, locais e parâmetros.',20),
  ('ADMINISTRATION_REPORTS','ADMINISTRATION','Consultar relatórios','Acessar relatórios administrativos e operacionais.',30)
on conflict(permission_key) do update set label=excluded.label,description=excluded.description,display_order=excluded.display_order,active=true;

create or replace function public.set_user_module_access(
  target_organization_id uuid,
  target_user_id uuid,
  target_module_key text,
  target_enabled boolean,
  target_visibility_scope public.user_visibility_scope default 'ALL_LOCATIONS'
) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then raise exception 'ACCESS_NOT_AUTHORIZED'; end if;
  if not exists(select 1 from public.user_roles where organization_id=target_organization_id and user_id=target_user_id) then raise exception 'ACCESS_TARGET_NOT_MEMBER'; end if;
  if not exists(select 1 from public.module_definitions where module_key=target_module_key and active) then raise exception 'ACCESS_INVALID_MODULE'; end if;
  insert into public.user_module_access(organization_id,user_id,module_key,enabled,visibility_scope,updated_by)
  values(target_organization_id,target_user_id,target_module_key,target_enabled,target_visibility_scope,auth.uid())
  on conflict(organization_id,user_id,module_key) do update set enabled=excluded.enabled,visibility_scope=excluded.visibility_scope,updated_by=auth.uid();
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
  values(target_organization_id,auth.uid(),'USER_MODULE_ACCESS_UPDATED','user_profile',target_user_id,jsonb_build_object('module',target_module_key,'enabled',target_enabled,'scope',target_visibility_scope),'WEB');
end;
$$;

create or replace function public.set_user_permission_grant(
  target_organization_id uuid,
  target_user_id uuid,
  target_permission_key text,
  target_enabled boolean
) returns void language plpgsql security definer set search_path=public as $$
declare permission_module text;
begin
  if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then raise exception 'ACCESS_NOT_AUTHORIZED'; end if;
  if not exists(select 1 from public.user_roles where organization_id=target_organization_id and user_id=target_user_id) then raise exception 'ACCESS_TARGET_NOT_MEMBER'; end if;
  select module_key into permission_module from public.module_permission_definitions where permission_key=target_permission_key and active;
  if permission_module is null then raise exception 'ACCESS_INVALID_PERMISSION'; end if;
  insert into public.user_permission_grants(organization_id,user_id,permission_key,enabled,updated_by)
  values(target_organization_id,target_user_id,target_permission_key,target_enabled,auth.uid())
  on conflict(organization_id,user_id,permission_key) do update set enabled=excluded.enabled,updated_by=auth.uid();
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
  values(target_organization_id,auth.uid(),'USER_PERMISSION_UPDATED','user_profile',target_user_id,jsonb_build_object('permission',target_permission_key,'module',permission_module,'enabled',target_enabled),'WEB');
end;
$$;

create or replace function public.copy_user_access_profile(
  target_organization_id uuid,
  source_user_id uuid,
  target_user_id uuid
) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then raise exception 'ACCESS_NOT_AUTHORIZED'; end if;
  if not exists(select 1 from public.user_roles where organization_id=target_organization_id and user_id=source_user_id)
     or not exists(select 1 from public.user_roles where organization_id=target_organization_id and user_id=target_user_id) then raise exception 'ACCESS_TARGET_NOT_MEMBER'; end if;
  insert into public.user_module_access(organization_id,user_id,module_key,enabled,visibility_scope,updated_by)
  select organization_id,target_user_id,module_key,enabled,visibility_scope,auth.uid() from public.user_module_access where organization_id=target_organization_id and user_id=source_user_id
  on conflict(organization_id,user_id,module_key) do update set enabled=excluded.enabled,visibility_scope=excluded.visibility_scope,updated_by=auth.uid();
  insert into public.user_permission_grants(organization_id,user_id,permission_key,enabled,updated_by)
  select organization_id,target_user_id,permission_key,enabled,auth.uid() from public.user_permission_grants where organization_id=target_organization_id and user_id=source_user_id
  on conflict(organization_id,user_id,permission_key) do update set enabled=excluded.enabled,updated_by=auth.uid();
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
  values(target_organization_id,auth.uid(),'USER_ACCESS_COPIED','user_profile',target_user_id,jsonb_build_object('source_user_id',source_user_id),'WEB');
end;
$$;

revoke all on function public.set_user_module_access(uuid,uuid,text,boolean,public.user_visibility_scope), public.set_user_permission_grant(uuid,uuid,text,boolean), public.copy_user_access_profile(uuid,uuid,uuid) from public;
grant execute on function public.set_user_module_access(uuid,uuid,text,boolean,public.user_visibility_scope), public.set_user_permission_grant(uuid,uuid,text,boolean), public.copy_user_access_profile(uuid,uuid,uuid) to authenticated;
