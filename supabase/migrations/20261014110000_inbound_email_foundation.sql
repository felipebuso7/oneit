create type public.inbound_email_provider as enum ('GMAIL_IMAP','OUTLOOK_IMAP','GENERIC_IMAP');
create type public.inbound_email_status as enum ('RECEIVED','CREATED_TICKET','IGNORED_BLOCKLIST','IGNORED_RULE','FAILED');

create table public.inbound_email_inboxes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  display_name text not null,
  mailbox_address text not null,
  provider public.inbound_email_provider not null,
  credential_secret_ref text not null,
  polling_interval_minutes integer not null default 2 check (polling_interval_minutes between 1 and 60),
  enabled boolean not null default true,
  last_polled_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, mailbox_address)
);

create table public.inbound_email_sender_exclusions (
  id uuid primary key default gen_random_uuid(),
  inbox_id uuid not null references public.inbound_email_inboxes(id) on delete cascade,
  sender_email text not null,
  reason text not null,
  active boolean not null default true,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (inbox_id, sender_email)
);

create table public.inbound_email_imports (
  id uuid primary key default gen_random_uuid(),
  inbox_id uuid not null references public.inbound_email_inboxes(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  provider_message_id text not null,
  sender_email text not null,
  subject text not null,
  received_at timestamptz not null,
  status public.inbound_email_status not null default 'RECEIVED',
  ticket_id uuid references public.tickets(id) on delete set null,
  failure_reason text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (inbox_id, provider_message_id)
);

create index inbound_email_inboxes_polling_idx on public.inbound_email_inboxes(enabled, last_polled_at);
create index inbound_email_imports_organization_status_idx on public.inbound_email_imports(organization_id, status, received_at desc);
create index inbound_email_imports_sender_idx on public.inbound_email_imports(organization_id, sender_email, received_at desc);

create trigger inbound_email_inboxes_updated before update on public.inbound_email_inboxes for each row execute function public.set_updated_at();

alter table public.inbound_email_inboxes enable row level security;
alter table public.inbound_email_sender_exclusions enable row level security;
alter table public.inbound_email_imports enable row level security;

create policy "admins manage inbound inboxes" on public.inbound_email_inboxes for all to authenticated
using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]))
with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]));

create policy "admins manage inbound exclusions" on public.inbound_email_sender_exclusions for all to authenticated
using (exists (select 1 from public.inbound_email_inboxes i where i.id = inbox_id and public.has_organization_role(i.organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])))
with check (exists (select 1 from public.inbound_email_inboxes i where i.id = inbox_id and public.has_organization_role(i.organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[])));

create policy "operators read inbound imports" on public.inbound_email_imports for select to authenticated
using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','DISPATCHER','MANAGER','AUDITOR']::public.platform_role[]));

create policy "dispatchers update inbound imports" on public.inbound_email_imports for update to authenticated
using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','DISPATCHER','MANAGER']::public.platform_role[]))
with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','DISPATCHER','MANAGER']::public.platform_role[]));

