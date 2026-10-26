create type public.sgsti_activity_status as enum ('PLANNED','IN_PROGRESS','AWAITING_EVIDENCE','UNDER_REVIEW','COMPLETED','OVERDUE','CANCELLED');
create type public.sgsti_periodicity as enum ('ONCE','MONTHLY','QUARTERLY','SEMIANNUAL','ANNUAL','CUSTOM');
create type public.sgsti_document_status as enum ('DRAFT','UNDER_REVIEW','PENDING_APPROVAL','EFFECTIVE','OBSOLETE');
create type public.sgsti_audit_status as enum ('PLANNED','IN_PROGRESS','AWAITING_EVIDENCE','VALIDATION','COMPLETED','CANCELLED');

create table public.sgsti_processes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text,
  name text not null,
  description text,
  active boolean not null default true,
  owner_id uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, name)
);

create table public.sgsti_activity_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  process_id uuid references public.sgsti_processes(id) on delete set null,
  title text not null,
  activity_type text not null,
  requirement_reference text,
  policy_reference text,
  periodicity public.sgsti_periodicity not null,
  custom_interval_days integer check(custom_interval_days is null or custom_interval_days between 1 and 3650),
  effective_from date not null default current_date,
  lead_time_days smallint not null default 15 check(lead_time_days between 0 and 365),
  reminder_days smallint[] not null default array[15,3,0]::smallint[] check(cardinality(reminder_days) between 1 and 10),
  due_after_days smallint not null default 0 check(due_after_days between 0 and 3650),
  responsible_id uuid references public.user_profiles(id) on delete set null,
  approver_id uuid references public.user_profiles(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(periodicity <> 'CUSTOM' or custom_interval_days is not null)
);

create table public.sgsti_activity_occurrences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  template_id uuid references public.sgsti_activity_templates(id) on delete set null,
  process_id uuid references public.sgsti_processes(id) on delete set null,
  title text not null,
  activity_type text not null,
  requirement_reference text,
  policy_reference text,
  competence date not null,
  planned_at date not null,
  due_at date not null,
  completed_at timestamptz,
  status public.sgsti_activity_status not null default 'PLANNED',
  responsible_id uuid references public.user_profiles(id) on delete set null,
  approver_id uuid references public.user_profiles(id) on delete set null,
  result_summary text,
  justification text,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(due_at >= planned_at)
);

create unique index sgsti_template_planned_unique
  on public.sgsti_activity_occurrences(template_id, planned_at)
  where template_id is not null;

create table public.sgsti_execution_records (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null unique references public.sgsti_activity_occurrences(id) on delete cascade,
  attendees text,
  minutes text,
  decisions text,
  result text,
  action_summary text,
  recorded_by uuid references public.user_profiles(id) on delete set null,
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sgsti_evidences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  occurrence_id uuid references public.sgsti_activity_occurrences(id) on delete cascade,
  audit_id uuid,
  title text not null,
  description text,
  evidence_kind text not null check(evidence_kind in ('FILE','EXTERNAL_LINK','TICKET','CHANGE','PROBLEM','REPORT','DASHBOARD','DOCUMENT','METRIC','OTHER')),
  external_url text,
  storage_key text,
  checksum text,
  note text,
  captured_at timestamptz not null default now(),
  captured_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check((external_url is not null) or (storage_key is not null) or (evidence_kind not in ('FILE','EXTERNAL_LINK')))
);

create table public.sgsti_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  process_id uuid references public.sgsti_processes(id) on delete set null,
  parent_id uuid references public.sgsti_documents(id) on delete set null,
  document_kind text not null check(document_kind in ('FOLDER','DOCUMENT')),
  code text,
  title text not null,
  version text,
  status public.sgsti_document_status not null default 'DRAFT',
  drive_url text,
  storage_key text,
  owner_id uuid references public.user_profiles(id) on delete set null,
  last_reviewed_at date,
  last_approved_at date,
  next_review_at date,
  obsolete_at timestamptz,
  obsolete_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check((document_kind = 'FOLDER') or drive_url is not null or storage_key is not null),
  check(status <> 'OBSOLETE' or (obsolete_at is not null and obsolete_reason is not null))
);

create sequence public.sgsti_audit_number_sequence start 1;
create or replace function public.next_sgsti_audit_number() returns text language plpgsql volatile set search_path=public as $$
begin
  return format('SGSTI-AUD-%s-%s', to_char(current_date, 'YYYY'), lpad(nextval('public.sgsti_audit_number_sequence')::text, 5, '0'));
end;
$$;

create table public.sgsti_audits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  audit_number text not null default public.next_sgsti_audit_number(),
  title text not null,
  audit_kind text not null check(audit_kind in ('INTERNAL','EXTERNAL','FOLLOW_UP')),
  scope text,
  criteria text,
  planned_at date not null,
  started_at timestamptz,
  completed_at timestamptz,
  status public.sgsti_audit_status not null default 'PLANNED',
  lead_auditor_id uuid references public.user_profiles(id) on delete set null,
  auditee_owner_id uuid references public.user_profiles(id) on delete set null,
  report_storage_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, audit_number)
);

create table public.sgsti_audit_findings (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.sgsti_audits(id) on delete cascade,
  finding_type text not null check(finding_type in ('NONCONFORMITY','OBSERVATION','IMPROVEMENT_OPPORTUNITY','STRENGTH')),
  requirement_reference text,
  description text not null,
  evidence_summary text,
  nonconformity_id uuid references public.nonconformities(id) on delete set null,
  created_at timestamptz not null default now(),
  check(nonconformity_id is null or finding_type = 'NONCONFORMITY')
);

alter table public.sgsti_evidences
  add constraint sgsti_evidences_audit_fk foreign key(audit_id) references public.sgsti_audits(id) on delete cascade;

create index sgsti_occurrence_competence_idx on public.sgsti_activity_occurrences(organization_id, competence, status);
create index sgsti_occurrence_due_idx on public.sgsti_activity_occurrences(organization_id, due_at, status);
create index sgsti_evidence_occurrence_idx on public.sgsti_evidences(occurrence_id);
create index sgsti_documents_review_idx on public.sgsti_documents(organization_id, next_review_at, status);
create index sgsti_audits_planned_idx on public.sgsti_audits(organization_id, planned_at, status);

create trigger sgsti_processes_updated before update on public.sgsti_processes for each row execute function public.set_updated_at();
create trigger sgsti_activity_templates_updated before update on public.sgsti_activity_templates for each row execute function public.set_updated_at();
create trigger sgsti_activity_occurrences_updated before update on public.sgsti_activity_occurrences for each row execute function public.set_updated_at();
create trigger sgsti_execution_records_updated before update on public.sgsti_execution_records for each row execute function public.set_updated_at();
create trigger sgsti_documents_updated before update on public.sgsti_documents for each row execute function public.set_updated_at();
create trigger sgsti_audits_updated before update on public.sgsti_audits for each row execute function public.set_updated_at();

alter table public.sgsti_processes enable row level security;
alter table public.sgsti_activity_templates enable row level security;
alter table public.sgsti_activity_occurrences enable row level security;
alter table public.sgsti_execution_records enable row level security;
alter table public.sgsti_evidences enable row level security;
alter table public.sgsti_documents enable row level security;
alter table public.sgsti_audits enable row level security;
alter table public.sgsti_audit_findings enable row level security;

create policy "members read sgsti processes" on public.sgsti_processes for select to authenticated using(public.is_organization_member(organization_id));
create policy "members read sgsti templates" on public.sgsti_activity_templates for select to authenticated using(public.is_organization_member(organization_id));
create policy "members read sgsti occurrences" on public.sgsti_activity_occurrences for select to authenticated using(public.is_organization_member(organization_id));
create policy "members read sgsti evidence" on public.sgsti_evidences for select to authenticated using(public.is_organization_member(organization_id));
create policy "members read sgsti documents" on public.sgsti_documents for select to authenticated using(public.is_organization_member(organization_id));
create policy "members read sgsti audits" on public.sgsti_audits for select to authenticated using(public.is_organization_member(organization_id));
create policy "members read sgsti findings" on public.sgsti_audit_findings for select to authenticated using(exists(select 1 from public.sgsti_audits a where a.id=audit_id and public.is_organization_member(a.organization_id)));
create policy "members read sgsti execution" on public.sgsti_execution_records for select to authenticated using(exists(select 1 from public.sgsti_activity_occurrences o where o.id=occurrence_id and public.is_organization_member(o.organization_id)));

create policy "governance manages sgsti processes" on public.sgsti_processes for all to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[])) with check(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]));
create policy "governance manages sgsti templates" on public.sgsti_activity_templates for all to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[])) with check(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]));
create policy "governance manages sgsti occurrences" on public.sgsti_activity_occurrences for all to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[])) with check(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]));
create policy "governance manages sgsti evidence" on public.sgsti_evidences for all to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[])) with check(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]));
create policy "governance manages sgsti documents" on public.sgsti_documents for all to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[])) with check(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]));
create policy "governance manages sgsti audits" on public.sgsti_audits for all to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[])) with check(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]));
create policy "governance manages sgsti findings" on public.sgsti_audit_findings for all to authenticated using(exists(select 1 from public.sgsti_audits a where a.id=audit_id and public.has_organization_role(a.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]))) with check(exists(select 1 from public.sgsti_audits a where a.id=audit_id and public.has_organization_role(a.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[])));
create policy "governance manages sgsti execution" on public.sgsti_execution_records for all to authenticated using(exists(select 1 from public.sgsti_activity_occurrences o where o.id=occurrence_id and public.has_organization_role(o.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]))) with check(exists(select 1 from public.sgsti_activity_occurrences o where o.id=occurrence_id and public.has_organization_role(o.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[])));

create or replace function public.generate_sgsti_occurrences(
  target_organization_id uuid,
  target_through date default (current_date + 30)
) returns integer language plpgsql security definer set search_path=public as $$
declare
  template_record public.sgsti_activity_templates%rowtype;
  scheduled_for date;
  inserted_count integer := 0;
  inserted_row_count integer := 0;
begin
  if target_through < current_date - 3650 then
    raise exception 'SGSTI_INVALID_GENERATION_WINDOW';
  end if;

  if not public.has_organization_role(
    target_organization_id,
    array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]
  ) then
    raise exception 'SGSTI_NOT_AUTHORIZED';
  end if;

  for template_record in
    select * from public.sgsti_activity_templates
    where organization_id = target_organization_id
      and active
      and effective_from <= target_through
  loop
    scheduled_for := template_record.effective_from;

    loop
      exit when scheduled_for > target_through;

      insert into public.sgsti_activity_occurrences(
        organization_id, template_id, process_id, title, activity_type,
        requirement_reference, policy_reference, competence, planned_at, due_at,
        responsible_id, approver_id, created_by
      )
      select
        template_record.organization_id, template_record.id, template_record.process_id,
        template_record.title, template_record.activity_type,
        template_record.requirement_reference, template_record.policy_reference,
        date_trunc('month', scheduled_for)::date, scheduled_for,
        scheduled_for + template_record.due_after_days,
        template_record.responsible_id, template_record.approver_id, auth.uid()
      where not exists (
        select 1 from public.sgsti_activity_occurrences occurrence
        where occurrence.template_id = template_record.id
          and occurrence.planned_at = scheduled_for
      );
      get diagnostics inserted_row_count = row_count;
      inserted_count := inserted_count + inserted_row_count;

      if template_record.periodicity = 'ONCE' then
        exit;
      elsif template_record.periodicity = 'MONTHLY' then
        scheduled_for := (scheduled_for + interval '1 month')::date;
      elsif template_record.periodicity = 'QUARTERLY' then
        scheduled_for := (scheduled_for + interval '3 months')::date;
      elsif template_record.periodicity = 'SEMIANNUAL' then
        scheduled_for := (scheduled_for + interval '6 months')::date;
      elsif template_record.periodicity = 'ANNUAL' then
        scheduled_for := (scheduled_for + interval '1 year')::date;
      else
        scheduled_for := scheduled_for + template_record.custom_interval_days;
      end if;
    end loop;
  end loop;

  return inserted_count;
end;
$$;

revoke all on function public.generate_sgsti_occurrences(uuid,date) from public;
grant execute on function public.generate_sgsti_occurrences(uuid,date) to authenticated;

