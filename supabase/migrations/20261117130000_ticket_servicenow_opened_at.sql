alter table public.tickets
  add column if not exists servicenow_opened_at date;

comment on column public.tickets.servicenow_opened_at is
  'Data de abertura do chamado no ServiceNow de origem; preservada sem conversão de fuso.';
