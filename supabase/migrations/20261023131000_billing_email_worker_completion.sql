create or replace function public.complete_billing_email(target_id uuid, target_provider_message_id text default null)
returns public.billing_email_log
language plpgsql
security invoker
set search_path = public
as $$
declare result public.billing_email_log;
begin
  update public.billing_email_log set status = 'SENT', sent_at = now(), locked_at = null, provider_message_id = target_provider_message_id, error_message = null where id = target_id and status = 'QUEUED' returning * into result;
  if not found then raise exception 'billing_email_not_claimed'; end if;
  return result;
end;
$$;

create or replace function public.fail_billing_email(target_id uuid, target_error text, target_retry_seconds integer default 300)
returns public.billing_email_log
language plpgsql
security invoker
set search_path = public
as $$
declare result public.billing_email_log;
begin
  update public.billing_email_log set status = case when attempt_count >= 5 then 'FAILED' else 'QUEUED' end, locked_at = null, next_attempt_at = now() + make_interval(secs => greatest(target_retry_seconds, 30)), error_message = left(target_error, 500) where id = target_id and status = 'QUEUED' returning * into result;
  if not found then raise exception 'billing_email_not_claimed'; end if;
  return result;
end;
$$;
