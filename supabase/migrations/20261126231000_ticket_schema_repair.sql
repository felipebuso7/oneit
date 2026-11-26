-- Reparo idempotente para ambientes onde a migration de unificação foi registrada
-- parcialmente. Não remove dados nem altera registros existentes.
alter table public.tickets add column if not exists servicenow_opened_at date;
alter table public.tickets add column if not exists requester_contact_phone text;
alter table public.tickets add column if not exists department_unit_id uuid references public.organization_units(id) on delete set null;
