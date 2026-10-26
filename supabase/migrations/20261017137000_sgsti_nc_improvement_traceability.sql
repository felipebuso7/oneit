-- SGSTI: mantém a origem, a análise causal e a jornada de uma NC ou melhoria.
-- Referências externas (por exemplo, Milldesk) são armazenadas como identificadores;
-- nenhuma integração externa é presumida por esta migração.
create table public.nonconformity_sources (
  id uuid primary key default gen_random_uuid(),
  nonconformity_id uuid not null references public.nonconformities(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  source_kind text not null check (source_kind in ('TICKET','AUDIT','RITUAL','CUSTOMER_FEEDBACK','SUPPLIER','RISK','MANUAL')),
  source_system text,
  external_reference text,
  source_url text,
  note text,
  linked_by uuid not null references public.user_profiles(id) on delete restrict,
  linked_at timestamptz not null default clock_timestamp()
);

create table public.nonconformity_cause_analyses (
  id uuid primary key default gen_random_uuid(),
  nonconformity_id uuid not null unique references public.nonconformities(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  method text not null check (method in ('FIVE_WHYS','ISHIKAWA','PROCESS_ANALYSIS','FREEFORM')),
  problem_statement text not null check(length(trim(problem_statement)) between 10 and 10000),
  direct_cause text,
  contributing_factors text,
  root_cause text not null check(length(trim(root_cause)) between 10 and 10000),
  containment_action text,
  analysed_by uuid not null references public.user_profiles(id) on delete restrict,
  analysed_at timestamptz not null default clock_timestamp(),
  effectiveness_due_at timestamptz
);

create index nonconformity_sources_org_idx on public.nonconformity_sources(organization_id, source_kind, linked_at desc);
create unique index nonconformity_sources_unique_reference_idx on public.nonconformity_sources(nonconformity_id, source_kind, coalesce(source_system,''), coalesce(external_reference,''));
create index nonconformity_cause_analyses_org_idx on public.nonconformity_cause_analyses(organization_id, analysed_at desc);
alter table public.nonconformity_sources enable row level security;
alter table public.nonconformity_cause_analyses enable row level security;
create policy "governance reads NC sources" on public.nonconformity_sources for select to authenticated using (public.has_sgsti_management_access(organization_id));
create policy "governance reads NC causal analyses" on public.nonconformity_cause_analyses for select to authenticated using (public.has_sgsti_management_access(organization_id));

create or replace function public.link_nonconformity_source(
  target_nonconformity_id uuid, target_source_kind text, target_source_system text default null,
  target_external_reference text default null, target_source_url text default null, target_note text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare nc public.nonconformities%rowtype; result_id uuid;
begin
  select * into nc from public.nonconformities where id=target_nonconformity_id for update;
  if nc.id is null or not public.has_sgsti_management_access(nc.organization_id) then raise exception 'NC_SOURCE_NOT_AUTHORIZED'; end if;
  if target_source_kind not in ('TICKET','AUDIT','RITUAL','CUSTOMER_FEEDBACK','SUPPLIER','RISK','MANUAL') then raise exception 'NC_SOURCE_INVALID_KIND'; end if;
  if target_external_reference is not null and length(trim(target_external_reference)) > 300 then raise exception 'NC_SOURCE_INVALID_REFERENCE'; end if;
  insert into public.nonconformity_sources(nonconformity_id,organization_id,source_kind,source_system,external_reference,source_url,note,linked_by)
  values(target_nonconformity_id,nc.organization_id,target_source_kind,nullif(trim(target_source_system),''),nullif(trim(target_external_reference),''),nullif(trim(target_source_url),''),nullif(trim(target_note),''),auth.uid())
  on conflict (nonconformity_id, source_kind, coalesce(source_system,''), coalesce(external_reference,'')) do update set source_url=excluded.source_url,note=excluded.note,linked_by=auth.uid(),linked_at=clock_timestamp()
  returning id into result_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
  values(nc.organization_id,auth.uid(),'NONCONFORMITY_SOURCE_LINKED','nonconformity',nc.id,jsonb_build_object('source_kind',target_source_kind,'reference',target_external_reference),'WEB');
  return result_id;
end; $$;

create or replace function public.save_nonconformity_cause_analysis(
  target_nonconformity_id uuid,target_method text,target_problem_statement text,target_direct_cause text,
  target_contributing_factors text,target_root_cause text,target_containment_action text,target_effectiveness_due_at timestamptz default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare nc public.nonconformities%rowtype; result_id uuid;
begin
  select * into nc from public.nonconformities where id=target_nonconformity_id for update;
  if nc.id is null or not public.has_sgsti_management_access(nc.organization_id) then raise exception 'NC_ANALYSIS_NOT_AUTHORIZED'; end if;
  if target_method not in ('FIVE_WHYS','ISHIKAWA','PROCESS_ANALYSIS','FREEFORM') or length(trim(target_problem_statement)) not between 10 and 10000 or length(trim(target_root_cause)) not between 10 and 10000 then raise exception 'NC_ANALYSIS_INVALID_INPUT'; end if;
  insert into public.nonconformity_cause_analyses(nonconformity_id,organization_id,method,problem_statement,direct_cause,contributing_factors,root_cause,containment_action,analysed_by,effectiveness_due_at)
  values(target_nonconformity_id,nc.organization_id,target_method,trim(target_problem_statement),nullif(trim(target_direct_cause),''),nullif(trim(target_contributing_factors),''),trim(target_root_cause),nullif(trim(target_containment_action),''),auth.uid(),target_effectiveness_due_at)
  on conflict(nonconformity_id) do update set method=excluded.method,problem_statement=excluded.problem_statement,direct_cause=excluded.direct_cause,contributing_factors=excluded.contributing_factors,root_cause=excluded.root_cause,containment_action=excluded.containment_action,analysed_by=auth.uid(),analysed_at=clock_timestamp(),effectiveness_due_at=excluded.effectiveness_due_at
  returning id into result_id;
  update public.nonconformities set root_cause=trim(target_root_cause), status=case when status='CORRECTION' then 'CORRECTIVE_ACTION'::public.nonconformity_status else status end where id=nc.id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
  values(nc.organization_id,auth.uid(),'NONCONFORMITY_CAUSE_ANALYSED','nonconformity',nc.id,jsonb_build_object('method',target_method),'WEB');
  return result_id;
end; $$;
revoke all on function public.link_nonconformity_source(uuid,text,text,text,text,text), public.save_nonconformity_cause_analysis(uuid,text,text,text,text,text,text,timestamptz) from public;
grant execute on function public.link_nonconformity_source(uuid,text,text,text,text,text), public.save_nonconformity_cause_analysis(uuid,text,text,text,text,text,text,timestamptz) to authenticated;
