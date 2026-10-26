create or replace function public.assert_outbox_worker()
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'OUTBOX_WORKER_NOT_AUTHORIZED';
  end if;
end;
$$;

create or replace function public.claim_outbox_events(
  target_limit integer default 20,
  target_lock_seconds integer default 300
)
returns table(
  id uuid,
  organization_id uuid,
  event_type text,
  aggregate_type text,
  aggregate_id uuid,
  payload jsonb,
  attempts integer,
  correlation_id uuid
)
language plpgsql security definer set search_path=public as $$
begin
  perform public.assert_outbox_worker();
  if target_limit not between 1 and 100 or target_lock_seconds not between 30 and 3600 then
    raise exception 'OUTBOX_INVALID_CLAIM_OPTIONS';
  end if;

  return query
  with candidates as (
    select event.id
    from public.outbox_events event
    where event.available_at <= now()
      and event.status in ('PENDING', 'PROCESSING')
    order by event.created_at
    for update skip locked
    limit target_limit
  ), claimed as (
    update public.outbox_events event
    set status = 'PROCESSING',
        attempts = event.attempts + 1,
        available_at = now() + make_interval(secs => target_lock_seconds),
        last_error = null
    from candidates
    where event.id = candidates.id
    returning event.*
  ), recorded as (
    insert into public.outbox_event_attempts(outbox_event_id, attempt_number, outcome)
    select id, attempts, 'STARTED' from claimed
  )
  select claimed.id, claimed.organization_id, claimed.event_type, claimed.aggregate_type,
    claimed.aggregate_id, claimed.payload, claimed.attempts, claimed.correlation_id
  from claimed;
end;
$$;

create or replace function public.complete_outbox_event(target_event_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare event_record public.outbox_events%rowtype;
begin
  perform public.assert_outbox_worker();
  update public.outbox_events
  set status = 'PROCESSED', processed_at = now(), available_at = now(), last_error = null
  where id = target_event_id and status = 'PROCESSING'
  returning * into event_record;
  if not found then raise exception 'OUTBOX_EVENT_NOT_PROCESSING'; end if;
  insert into public.outbox_event_attempts(outbox_event_id, attempt_number, outcome)
  values(event_record.id, event_record.attempts, 'SUCCEEDED');
  insert into public.audit_logs(organization_id, action, entity_type, entity_id, after_value, source)
  values(event_record.organization_id, 'OUTBOX_EVENT_PROCESSED', 'outbox_event', event_record.id,
    jsonb_build_object('event_type', event_record.event_type, 'attempts', event_record.attempts), 'WORKER');
end;
$$;

create or replace function public.fail_outbox_event(
  target_event_id uuid,
  target_error text,
  target_retryable boolean default true,
  target_retry_delay_seconds integer default 60,
  target_max_attempts integer default 8
)
returns void language plpgsql security definer set search_path=public as $$
declare event_record public.outbox_events%rowtype; should_retry boolean;
begin
  perform public.assert_outbox_worker();
  if target_retry_delay_seconds not between 1 and 86400 or target_max_attempts not between 1 and 50 then
    raise exception 'OUTBOX_INVALID_RETRY_OPTIONS';
  end if;
  select * into event_record from public.outbox_events where id = target_event_id for update;
  if not found or event_record.status <> 'PROCESSING' then raise exception 'OUTBOX_EVENT_NOT_PROCESSING'; end if;
  should_retry := target_retryable and event_record.attempts < target_max_attempts;
  update public.outbox_events
  set status = case when should_retry then 'PENDING'::public.outbox_event_status else 'FAILED'::public.outbox_event_status end,
      available_at = case when should_retry then now() + make_interval(secs => target_retry_delay_seconds) else now() end,
      last_error = left(coalesce(nullif(trim(target_error), ''), 'OUTBOX_HANDLER_FAILED'), 1000),
      processed_at = case when should_retry then null else now() end
  where id = target_event_id;
  insert into public.outbox_event_attempts(outbox_event_id, attempt_number, outcome, error_summary)
  values(event_record.id, event_record.attempts, 'FAILED', left(coalesce(nullif(trim(target_error), ''), 'OUTBOX_HANDLER_FAILED'), 1000));
  insert into public.audit_logs(organization_id, action, entity_type, entity_id, after_value, source)
  values(event_record.organization_id, case when should_retry then 'OUTBOX_EVENT_RETRY_SCHEDULED' else 'OUTBOX_EVENT_FAILED' end,
    'outbox_event', event_record.id,
    jsonb_build_object('attempts', event_record.attempts, 'retryable', should_retry), 'WORKER');
end;
$$;

revoke all on function public.assert_outbox_worker(), public.claim_outbox_events(integer,integer), public.complete_outbox_event(uuid), public.fail_outbox_event(uuid,text,boolean,integer,integer) from public, authenticated, anon;
grant execute on function public.claim_outbox_events(integer,integer), public.complete_outbox_event(uuid), public.fail_outbox_event(uuid,text,boolean,integer,integer) to service_role;
