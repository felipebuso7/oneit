create type public.ticket_operational_status as enum (
  'NEW', 'TRIAGE', 'AWAITING_SCHEDULING', 'SCHEDULED', 'ASSIGNED', 'TRAVEL_STARTED',
  'ON_SITE', 'WORK_STARTED', 'IN_PROGRESS', 'TECHNICALLY_COMPLETED',
  'PENDING_CUSTOMER', 'PENDING_ACCESS', 'PENDING_MATERIAL', 'PENDING_THIRD_PARTY',
  'PENDING_CLIENT_IT', 'RESCHEDULED', 'OUT_OF_SCOPE', 'CANCELLED', 'DUPLICATE', 'INVALID',
  'WAITING_AUTHORIZATION'
);
create type public.ticket_administrative_status as enum (
  'AWAITING_TRIAGE', 'AWAITING_REVIEW', 'RETURNED_TO_TECHNICIAN', 'APPROVED',
  'REPORT_GENERATED', 'SYNC_PENDING', 'SYNCHRONIZED', 'CLOSED'
);
create type public.ticket_status_dimension as enum ('OPERATIONAL', 'ADMINISTRATIVE');
create type public.ticket_impact as enum ('LOW', 'MEDIUM', 'HIGH');

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  contract_id uuid references public.contracts(id) on delete restrict,
  location_id uuid not null references public.customer_locations(id) on delete restrict,
  requester_contact_id uuid references public.location_contacts(id) on delete set null,
  ticket_number text not null unique,
  milldesk_id text,
  milldesk_number text,
  servicenow_id text,
  servicenow_number text,
  title text not null,
  description text not null,
  category_code text,
  service_type_code text,
  impact public.ticket_impact not null default 'LOW',
  urgency public.ticket_impact not null default 'LOW',
  priority smallint not null default 4 check (priority between 1 and 5),
  operational_status public.ticket_operational_status not null default 'NEW',
  administrative_status public.ticket_administrative_status not null default 'AWAITING_TRIAGE',
  opened_at timestamptz not null default now(),
  imported_at timestamptz,
  scheduled_at timestamptz,
  assigned_technician_id uuid references public.technicians(id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, milldesk_id),
  unique (organization_id, servicenow_id)
);

create table public.ticket_status_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  dimension public.ticket_status_dimension not null,
  previous_status text,
  next_status text not null,
  actor_id uuid references public.user_profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create index tickets_organization_status_idx on public.tickets (organization_id, operational_status);
create index tickets_contract_opened_idx on public.tickets (contract_id, opened_at desc);
create index tickets_technician_scheduled_idx on public.tickets (assigned_technician_id, scheduled_at);
create index tickets_milldesk_idx on public.tickets (milldesk_id);
create index ticket_status_history_ticket_idx on public.ticket_status_history (ticket_id, created_at);

create sequence public.ticket_number_sequence start 1;

create or replace function public.next_ticket_number()
returns text language plpgsql volatile set search_path = public as $$
declare sequence_value bigint;
begin
  select nextval('public.ticket_number_sequence') into sequence_value;
  return format('FSM-%s-%s', to_char(current_date, 'YYYY'), lpad(sequence_value::text, 6, '0'));
end;
$$;
alter table public.tickets alter column ticket_number set default public.next_ticket_number();

create or replace function public.record_ticket_status_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.ticket_status_history (ticket_id, organization_id, dimension, next_status, actor_id)
    values (new.id, new.organization_id, 'OPERATIONAL', new.operational_status::text, auth.uid()),
           (new.id, new.organization_id, 'ADMINISTRATIVE', new.administrative_status::text, auth.uid());
  else
    if old.operational_status is distinct from new.operational_status then
      insert into public.ticket_status_history (ticket_id, organization_id, dimension, previous_status, next_status, actor_id)
      values (new.id, new.organization_id, 'OPERATIONAL', old.operational_status::text, new.operational_status::text, auth.uid());
    end if;
    if old.administrative_status is distinct from new.administrative_status then
      insert into public.ticket_status_history (ticket_id, organization_id, dimension, previous_status, next_status, actor_id)
      values (new.id, new.organization_id, 'ADMINISTRATIVE', old.administrative_status::text, new.administrative_status::text, auth.uid());
    end if;
  end if;
  return new;
end;
$$;
create or replace function public.increment_ticket_version()
returns trigger language plpgsql set search_path = public as $$
begin
  new.version = old.version + 1;
  return new;
end;
$$;
create trigger tickets_updated before update on public.tickets for each row execute function public.set_updated_at();
create trigger tickets_increment_version before update on public.tickets for each row execute function public.increment_ticket_version();
create trigger tickets_status_history after insert or update on public.tickets for each row execute function public.record_ticket_status_history();

create or replace function public.has_ticket_management_role(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_organization_role(target_organization_id, array['SUPER_ADMIN','ORG_ADMIN','DISPATCHER','MANAGER']::public.platform_role[]);
$$;
create or replace function public.is_ticket_assigned_to_current_user(target_technician_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.technicians where id = target_technician_id and user_id = auth.uid());
$$;
revoke all on function public.has_ticket_management_role(uuid), public.is_ticket_assigned_to_current_user(uuid) from public;
grant execute on function public.has_ticket_management_role(uuid), public.is_ticket_assigned_to_current_user(uuid) to authenticated;

alter table public.tickets enable row level security;
alter table public.ticket_status_history enable row level security;
create policy "management reads tickets" on public.tickets for select to authenticated using (public.has_ticket_management_role(organization_id));
create policy "technicians read assigned tickets" on public.tickets for select to authenticated using (assigned_technician_id is not null and public.is_ticket_assigned_to_current_user(assigned_technician_id));
create policy "management creates tickets" on public.tickets for insert to authenticated with check (public.has_ticket_management_role(organization_id));
create policy "management updates tickets" on public.tickets for update to authenticated using (public.has_ticket_management_role(organization_id)) with check (public.has_ticket_management_role(organization_id));
create policy "management reads ticket history" on public.ticket_status_history for select to authenticated using (public.has_ticket_management_role(organization_id));
create policy "technicians read own ticket history" on public.ticket_status_history for select to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_id and t.assigned_technician_id is not null and public.is_ticket_assigned_to_current_user(t.assigned_technician_id)));
