-- Índices alinhados às filas operacionais que filtram por tenant e ordenam por atualização.
create index if not exists tickets_organization_updated_idx
  on public.tickets (organization_id, updated_at desc);

create index if not exists ticket_schedules_status_start_idx
  on public.ticket_schedules (status, planned_start)
  where status = 'SCHEDULED';

create index if not exists service_orders_org_status_start_idx
  on public.service_orders (organization_id, status, scheduled_at);
