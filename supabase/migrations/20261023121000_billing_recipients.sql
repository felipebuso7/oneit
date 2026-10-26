create table public.billing_recipients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  recipient_type text not null check (recipient_type in ('MEASUREMENT','FISCAL')),
  email text not null check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, recipient_type, email)
);
create index billing_recipients_lookup_idx on public.billing_recipients(organization_id, recipient_type, active);
alter table public.billing_recipients enable row level security;
create policy "members read billing recipients" on public.billing_recipients for select to authenticated using (public.is_organization_member(organization_id));
create policy "finance managers manage billing recipients" on public.billing_recipients for all to authenticated using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[])) with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]));
create trigger billing_recipients_updated before update on public.billing_recipients for each row execute function public.set_updated_at();
