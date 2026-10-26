alter table public.tickets
  add column ticket_type text not null default 'INCIDENT'
  check (ticket_type in ('INCIDENT', 'SERVICE_REQUEST', 'ACCESS_REQUEST', 'EVENT', 'PREVENTIVE', 'CONSULTATION'));

create table public.ticket_priority_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  impact public.ticket_impact not null,
  urgency public.ticket_impact not null,
  priority smallint not null check (priority between 1 and 5),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, impact, urgency)
);
create index ticket_priority_policies_organization_idx on public.ticket_priority_policies (organization_id, active);
create trigger ticket_priority_policies_updated before update on public.ticket_priority_policies for each row execute function public.set_updated_at();
alter table public.ticket_priority_policies enable row level security;
create policy "members read ticket priority policies" on public.ticket_priority_policies for select to authenticated using (public.is_organization_member(organization_id));
create policy "admins manage ticket priority policies" on public.ticket_priority_policies for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));

insert into public.ticket_priority_policies (organization_id, impact, urgency, priority)
select organization.id, matrix.impact::public.ticket_impact, matrix.urgency::public.ticket_impact, matrix.priority
from public.organizations organization
cross join (values
  ('HIGH', 'HIGH', 1), ('HIGH', 'MEDIUM', 2), ('HIGH', 'LOW', 3),
  ('MEDIUM', 'HIGH', 2), ('MEDIUM', 'MEDIUM', 3), ('MEDIUM', 'LOW', 4),
  ('LOW', 'HIGH', 3), ('LOW', 'MEDIUM', 4), ('LOW', 'LOW', 5)
) as matrix(impact, urgency, priority)
on conflict (organization_id, impact, urgency) do nothing;

create or replace function public.apply_ticket_priority_policy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare configured_priority smallint;
begin
  select priority into configured_priority
  from public.ticket_priority_policies
  where organization_id = new.organization_id and impact = new.impact and urgency = new.urgency and active
  limit 1;
  if configured_priority is null then
    raise exception 'TICKET_PRIORITY_POLICY_MISSING';
  end if;
  new.priority := configured_priority;
  return new;
end;
$$;
create trigger tickets_apply_priority_policy
before insert on public.tickets
for each row execute function public.apply_ticket_priority_policy();

create or replace function public.bootstrap_organization(
  target_user_id uuid, target_email text, target_full_name text, organization_legal_name text, organization_display_name text
) returns uuid language plpgsql security definer set search_path = public as $$
declare created_organization_id uuid;
begin
  if not exists (select 1 from auth.users where id = target_user_id) then raise exception 'The target user must exist in auth.users.'; end if;
  insert into public.organizations (legal_name, display_name) values (organization_legal_name, organization_display_name) returning id into created_organization_id;
  insert into public.user_profiles (id, full_name, email) values (target_user_id, target_full_name, target_email) on conflict (id) do update set full_name = excluded.full_name, email = excluded.email;
  insert into public.user_roles (user_id, organization_id, role) values (target_user_id, created_organization_id, 'SUPER_ADMIN') on conflict do nothing;
  insert into public.ticket_priority_policies (organization_id, impact, urgency, priority) values
    (created_organization_id, 'HIGH', 'HIGH', 1), (created_organization_id, 'HIGH', 'MEDIUM', 2), (created_organization_id, 'HIGH', 'LOW', 3),
    (created_organization_id, 'MEDIUM', 'HIGH', 2), (created_organization_id, 'MEDIUM', 'MEDIUM', 3), (created_organization_id, 'MEDIUM', 'LOW', 4),
    (created_organization_id, 'LOW', 'HIGH', 3), (created_organization_id, 'LOW', 'MEDIUM', 4), (created_organization_id, 'LOW', 'LOW', 5);
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, source) values (created_organization_id, target_user_id, 'ORGANIZATION_BOOTSTRAPPED', 'organization', created_organization_id, 'SERVER');
  return created_organization_id;
end;
$$;
