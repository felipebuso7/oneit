create type public.supplier_sla_action_status as enum ('OPEN','IN_PROGRESS','BLOCKED','COMPLETED','CANCELLED');

create table public.supplier_sla_actions (
  id uuid primary key default gen_random_uuid(),
  sla_record_id uuid not null references public.supplier_sla_records(id) on delete restrict,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  action_description text not null check(length(trim(action_description)) between 5 and 5000),
  owner_id uuid references public.user_profiles(id) on delete set null,
  due_date date,
  evidence_reference text,
  status public.supplier_sla_action_status not null default 'OPEN',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.user_profiles(id) on delete set null,
  check((status = 'COMPLETED') = (completed_at is not null))
);

create index supplier_sla_actions_org_status_idx on public.supplier_sla_actions(organization_id,status,due_date);
create trigger supplier_sla_actions_updated before update on public.supplier_sla_actions for each row execute function public.set_updated_at();
alter table public.supplier_sla_actions enable row level security;
create policy "members read supplier sla actions" on public.supplier_sla_actions for select to authenticated using(public.is_organization_member(organization_id));
create policy "managers manage supplier sla actions" on public.supplier_sla_actions for all to authenticated using(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[])) with check(public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]));
