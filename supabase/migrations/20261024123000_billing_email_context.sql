-- Contexto auditável do e-mail: competência, link de planilha e referências do documento.
alter table public.billing_email_log add column if not exists context jsonb not null default '{}'::jsonb;
alter table public.billing_email_log add constraint billing_email_context_size check (pg_column_size(context) <= 16384);
