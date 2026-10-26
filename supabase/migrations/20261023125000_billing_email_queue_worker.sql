-- Metadados para processamento seguro por worker autorizado.
-- A função de claim será criada somente após definir a identidade/allowlist do worker.
alter table public.billing_email_log add column if not exists attempt_count integer not null default 0 check (attempt_count >= 0);
alter table public.billing_email_log add column if not exists locked_at timestamptz;
alter table public.billing_email_log add column if not exists next_attempt_at timestamptz not null default now();
create index billing_email_queue_idx on public.billing_email_log(status, next_attempt_at, locked_at);

create or replace function public.claim_billing_email(target_worker text)
returns public.billing_email_log
language plpgsql
security invoker
set search_path = public
as $$
declare claimed public.billing_email_log;
begin
  with candidate as (
    select id from public.billing_email_log
     where status = 'QUEUED' and next_attempt_at <= now() and (locked_at is null or locked_at < now() - interval '15 minutes')
     order by created_at for update skip locked limit 1
  )
  update public.billing_email_log log set locked_at = now(), attempt_count = log.attempt_count + 1, provider = coalesce(nullif(target_worker, ''), 'WORKER')
   where log.id = (select id from candidate) returning log.* into claimed;
  return claimed;
end;
$$;
