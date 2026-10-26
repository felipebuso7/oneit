create table public.support_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,79}$'),
  name text not null check (length(trim(name)) between 2 and 200),
  support_level smallint not null check (support_level between 1 and 3),
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create table public.support_group_members (
  id uuid primary key default gen_random_uuid(),
  support_group_id uuid not null references public.support_groups(id) on delete restrict,
  user_id uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (support_group_id, user_id)
);
alter table public.tickets add column resolver_group_id uuid references public.support_groups(id) on delete set null;
alter table public.tickets add column support_level smallint not null default 1 check (support_level between 1 and 3);
create table public.ticket_escalations (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  escalation_type text not null check (escalation_type in ('FUNCTIONAL', 'HIERARCHICAL')),
  source_group_id uuid references public.support_groups(id) on delete restrict,
  target_group_id uuid not null references public.support_groups(id) on delete restrict,
  source_level smallint not null check (source_level between 1 and 3),
  target_level smallint not null check (target_level between 1 and 3),
  reason text not null check (length(trim(reason)) between 10 and 2000),
  technical_summary text check (technical_summary is null or length(trim(technical_summary)) between 10 and 10000),
  escalated_by uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index ticket_escalations_ticket_idx on public.ticket_escalations(ticket_id, created_at desc);
create trigger support_groups_updated before update on public.support_groups for each row execute function public.set_updated_at();
alter table public.support_groups enable row level security; alter table public.support_group_members enable row level security; alter table public.ticket_escalations enable row level security;
create policy "members read support groups" on public.support_groups for select to authenticated using (public.is_organization_member(organization_id));
create policy "admins manage support groups" on public.support_groups for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));
create policy "members read support group members" on public.support_group_members for select to authenticated using (exists (select 1 from public.support_groups group_item where group_item.id = support_group_id and public.is_organization_member(group_item.organization_id)));
create policy "admins manage support group members" on public.support_group_members for all to authenticated using (exists (select 1 from public.support_groups group_item where group_item.id = support_group_id and public.has_organization_role(group_item.organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]))) with check (exists (select 1 from public.support_groups group_item where group_item.id = support_group_id and public.has_organization_role(group_item.organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])));
create policy "management reads ticket escalations" on public.ticket_escalations for select to authenticated using (public.has_ticket_management_role(organization_id));

create or replace function public.create_support_group(target_organization_id uuid, target_code text, target_name text, target_support_level smallint)
returns uuid language plpgsql security definer set search_path = public as $$
declare group_id uuid;
begin
  if not public.has_organization_role(target_organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then raise exception 'SUPPORT_GROUP_NOT_AUTHORIZED'; end if;
  if target_code !~ '^[A-Z0-9][A-Z0-9_-]{1,79}$' or length(trim(target_name)) not between 2 and 200 or target_support_level not between 1 and 3 then raise exception 'SUPPORT_GROUP_INVALID_INPUT'; end if;
  insert into public.support_groups (organization_id, code, name, support_level) values (target_organization_id, target_code, trim(target_name), target_support_level) returning id into group_id;
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, after_value, source) values (target_organization_id, auth.uid(), 'SUPPORT_GROUP_CREATED', 'support_group', group_id, jsonb_build_object('code', target_code, 'support_level', target_support_level), 'WEB');
  return group_id;
end;
$$;
revoke all on function public.create_support_group(uuid, text, text, smallint) from public;
grant execute on function public.create_support_group(uuid, text, text, smallint) to authenticated;

create or replace function public.escalate_ticket(
  target_ticket_id uuid, target_group_id uuid, target_escalation_type text, target_reason text, target_technical_summary text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare ticket public.tickets%rowtype; group_item public.support_groups%rowtype; escalation_id uuid;
begin
  select * into ticket from public.tickets where id = target_ticket_id for update;
  if ticket.id is null or not public.has_ticket_management_role(ticket.organization_id) then raise exception 'ESCALATION_NOT_AUTHORIZED'; end if;
  select * into group_item from public.support_groups where id = target_group_id and organization_id = ticket.organization_id and active;
  if group_item.id is null then raise exception 'ESCALATION_GROUP_OUT_OF_SCOPE'; end if;
  if target_escalation_type not in ('FUNCTIONAL', 'HIERARCHICAL') then raise exception 'ESCALATION_INVALID_TYPE'; end if;
  if length(trim(target_reason)) not between 10 and 2000 then raise exception 'ESCALATION_INVALID_REASON'; end if;
  if target_technical_summary is not null and length(trim(target_technical_summary)) not between 10 and 10000 then raise exception 'ESCALATION_INVALID_SUMMARY'; end if;
  if target_escalation_type = 'FUNCTIONAL' and group_item.support_level <= ticket.support_level then raise exception 'ESCALATION_FUNCTIONAL_LEVEL_MUST_INCREASE'; end if;
  insert into public.ticket_escalations (ticket_id, organization_id, escalation_type, source_group_id, target_group_id, source_level, target_level, reason, technical_summary, escalated_by)
  values (ticket.id, ticket.organization_id, target_escalation_type, ticket.resolver_group_id, group_item.id, ticket.support_level, group_item.support_level, trim(target_reason), nullif(trim(target_technical_summary), ''), auth.uid()) returning id into escalation_id;
  update public.tickets set resolver_group_id = group_item.id, support_level = greatest(ticket.support_level, group_item.support_level) where id = ticket.id;
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values (ticket.organization_id, auth.uid(), 'TICKET_ESCALATED', 'ticket', ticket.id, jsonb_build_object('escalation_id', escalation_id, 'type', target_escalation_type, 'target_group_id', group_item.id, 'target_level', group_item.support_level), 'WEB');
  return escalation_id;
end;
$$;
revoke all on function public.escalate_ticket(uuid, uuid, text, text, text) from public;
grant execute on function public.escalate_ticket(uuid, uuid, text, text, text) to authenticated;
