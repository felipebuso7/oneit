create table public.billing_email_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  fiscal_batch_id uuid references public.fiscal_batches(id) on delete restrict,
  measurement_sheet_id uuid references public.measurement_sheets(id) on delete restrict,
  email_type text not null check (email_type in ('MEASUREMENT','FISCAL')),
  recipients jsonb not null default '[]'::jsonb,
  subject text not null,
  attachments jsonb not null default '[]'::jsonb,
  provider text not null default 'PENDING',
  status text not null default 'QUEUED' check (status in ('QUEUED','SENT','FAILED')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index billing_email_log_lookup_idx on public.billing_email_log(organization_id, email_type, created_at desc);
alter table public.billing_email_log enable row level security;
create policy "members read billing email log" on public.billing_email_log for select to authenticated using (public.is_organization_member(organization_id));
create policy "finance managers create billing email log" on public.billing_email_log for insert to authenticated with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]));
