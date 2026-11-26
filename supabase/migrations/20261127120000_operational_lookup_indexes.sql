-- Índices incrementais para as consultas tenant-scoped dos fluxos operacionais.
-- Não altera dados, constraints ou a semântica de autorização.
create index if not exists collaborators_customer_status_name_idx
  on public.collaborators (organization_id, customer_id, status, full_name);

create index if not exists customer_locations_org_customer_active_name_idx
  on public.customer_locations (organization_id, customer_id, active, name);

create index if not exists tickets_org_customer_status_created_idx
  on public.tickets (organization_id, customer_id, operational_status, created_at desc);
