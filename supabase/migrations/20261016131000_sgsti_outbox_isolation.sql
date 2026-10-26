-- SGSTI reminders are claimed separately so their scheduler never processes events from other modules.
create or replace function public.claim_sgsti_reminder_events(
  target_limit integer default 20,
  target_lock_seconds integer default 300
)
returns table(id uuid,organization_id uuid,event_type text,aggregate_type text,aggregate_id uuid,payload jsonb,attempts integer,correlation_id uuid)
language plpgsql security definer set search_path=public as $$
begin
  perform public.assert_outbox_worker();
  if target_limit not between 1 and 100 or target_lock_seconds not between 30 and 3600 then raise exception 'OUTBOX_INVALID_CLAIM_OPTIONS'; end if;
  return query
  with candidates as (
    select event.id from public.outbox_events event
    where event.available_at <= now() and event.status in ('PENDING','PROCESSING') and event.event_type='SGSTI_REMINDER'
    order by event.created_at for update skip locked limit target_limit
  ), claimed as (
    update public.outbox_events event set status='PROCESSING',attempts=event.attempts+1,available_at=now()+make_interval(secs=>target_lock_seconds),last_error=null
    from candidates where event.id=candidates.id returning event.*
  ), recorded as (
    insert into public.outbox_event_attempts(outbox_event_id,attempt_number,outcome) select id,attempts,'STARTED' from claimed
  ) select claimed.id,claimed.organization_id,claimed.event_type,claimed.aggregate_type,claimed.aggregate_id,claimed.payload,claimed.attempts,claimed.correlation_id from claimed;
end; $$;
revoke all on function public.claim_sgsti_reminder_events(integer,integer) from public,authenticated,anon;
grant execute on function public.claim_sgsti_reminder_events(integer,integer) to service_role;
