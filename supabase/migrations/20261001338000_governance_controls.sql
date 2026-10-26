create type public.governance_framework as enum ('ISO_IEC_20000_1_2018','COBIT','ITIL');
create type public.governance_control_status as enum ('PLANNED','IMPLEMENTED','EFFECTIVE','NEEDS_IMPROVEMENT','RETIRED');

create table public.governance_controls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  framework public.governance_framework not null,
  reference_code text not null check(length(trim(reference_code)) between 1 and 100),
  process_name text not null check(length(trim(process_name)) between 2 and 240),
  control_objective text not null check(length(trim(control_objective)) between 10 and 2000),
  owner_id uuid references public.user_profiles(id) on delete set null,
  evidence_description text check(evidence_description is null or length(trim(evidence_description)) <= 2000),
  review_frequency_days integer check(review_frequency_days is null or review_frequency_days between 1 and 1095),
  last_reviewed_at timestamptz,
  status public.governance_control_status not null default 'PLANNED',
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.user_profiles(id) on delete set null,
  unique(organization_id, framework, reference_code, process_name)
);

create index governance_controls_org_status_idx on public.governance_controls(organization_id, status, framework);
create trigger governance_controls_updated before update on public.governance_controls for each row execute function public.set_updated_at();

alter table public.governance_controls enable row level security;
create policy "governance reads controls" on public.governance_controls for select to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[]));
create policy "governance manages controls" on public.governance_controls for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]));
