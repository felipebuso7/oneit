create table if not exists public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 4194304),
  created_at timestamptz not null default now()
);
create index if not exists ticket_attachments_ticket on public.ticket_attachments(ticket_id, created_at);
alter table public.ticket_attachments enable row level security;
create policy "read visible ticket attachments" on public.ticket_attachments for select to authenticated using (public.is_organization_member(organization_id));
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('ticket-attachments', 'ticket-attachments', false, 4194304, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "read registered ticket attachments" on storage.objects for select to authenticated
using (bucket_id = 'ticket-attachments' and exists (select 1 from public.ticket_attachments a where a.storage_path = name));

drop function if exists public.get_partner_service_order_context(text, text);
create or replace function public.get_partner_service_order_context(target_token text, target_code text)
returns table(service_order_id uuid, order_number text, ticket_number text, title text, scheduled_at timestamptz, status text, location_name text, location_address text, local_contact_name text, local_contact_phone text, materials jsonb, requester_attachments jsonb)
language plpgsql security definer set search_path=public as $$
declare access_record public.service_order_partner_accesses%rowtype;
begin
  access_record := public.assert_partner_access(target_token, target_code);
  return query select so.id, so.order_number, t.ticket_number, t.title, so.scheduled_at, so.status, loc.name,
    concat_ws(', ', loc.street, loc.street_number, loc.complement, loc.district, loc.city, loc.state_code),
    coalesce(so.local_contact_name, contact.name), coalesce(so.local_contact_phone, coalesce(contact.mobile, contact.phone)),
    coalesce((select jsonb_agg(jsonb_build_object('name', tm.material_name, 'quantity', tm.quantity, 'unit', tm.unit) order by tm.created_at) from public.ticket_materials tm where tm.ticket_id=t.id), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.file_name, 'storagePath', a.storage_path, 'mime', a.mime_type, 'size', a.size_bytes) order by a.created_at) from public.ticket_attachments a where a.ticket_id=t.id), '[]'::jsonb)
  from public.service_orders so join public.tickets t on t.id=so.ticket_id join public.customer_locations loc on loc.id=so.location_id
  left join public.location_contacts contact on contact.id=t.requester_contact_id where so.id=access_record.service_order_id;
end; $$;
revoke all on function public.get_partner_service_order_context(text,text) from public;
grant execute on function public.get_partner_service_order_context(text,text) to anon;
