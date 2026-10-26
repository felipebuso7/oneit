-- Evita duplicidade de disparo para o mesmo BM/lote e tipo de e-mail.
alter table public.billing_email_log add column if not exists idempotency_key text;
create unique index if not exists billing_email_log_idempotency_idx on public.billing_email_log(idempotency_key) where idempotency_key is not null;
