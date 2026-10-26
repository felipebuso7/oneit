-- Generates auditable SGSTI reminders. Delivery is first recorded in the OneIT notification center;
-- e-mail can later be attached as a separate, configured outbox handler.
create table public.sgsti_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  outbox_event_id uuid not null unique references public.outbox_events(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  recipient_id uuid not null references public.user_profiles(id) on delete restrict,
  notification_type text not null check(notification_type in ('ACTIVITY_REMINDER','ACTIVITY_OVERDUE','APPROVAL_PENDING')),
  title text not null check(length(trim(title)) between 3 and 240),
  body text not null check(length(trim(body)) between 3 and 4000),
  target_path text not null check(target_path like '/portal/%'),
  read_at timestamptz,
  delivered_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index sgsti_notifications_recipient_idx on public.sgsti_notification_deliveries(recipient_id, read_at, delivered_at desc);
alter table public.sgsti_notification_deliveries enable row level security;
create policy "recipient reads sgsti notifications" on public.sgsti_notification_deliveries for select to authenticated using(recipient_id=auth.uid() or public.has_organization_role(organization_id,array['SUPER_ADMIN','ORG_ADMIN','AUDITOR']::public.platform_role[]));
create policy "recipient marks sgsti notifications read" on public.sgsti_notification_deliveries for update to authenticated using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());

create or replace function public.schedule_sgsti_reminders(target_day date default current_date)
returns integer language plpgsql security definer set search_path=public as $$
declare inserted_count integer := 0;
begin
  perform public.assert_outbox_worker();
  if target_day not between current_date - 30 and current_date + 370 then raise exception 'SGSTI_REMINDER_DATE_OUT_OF_RANGE'; end if;
  with reminder_candidates as (
    select o.id as occurrence_id,o.organization_id,o.title,o.due_at,o.status,o.responsible_id,profile.full_name,
      reminder_day::integer as reminder_days,
      'ACTIVITY_REMINDER'::text as notification_type
    from public.sgsti_activity_occurrences o
    join public.sgsti_activity_templates t on t.id=o.template_id
    join public.user_profiles profile on profile.id=o.responsible_id and profile.active
    cross join lateral unnest(t.reminder_days) reminder_day
    where o.status not in ('COMPLETED','CANCELLED') and o.due_at - reminder_day::integer = target_day
    union all
    select o.id,o.organization_id,o.title,o.due_at,o.status,o.responsible_id,profile.full_name,
      0,'ACTIVITY_OVERDUE'
    from public.sgsti_activity_occurrences o
    join public.user_profiles profile on profile.id=o.responsible_id and profile.active
    where o.status not in ('COMPLETED','CANCELLED') and o.due_at < target_day
  ), inserted as (
    insert into public.outbox_events(organization_id,event_type,aggregate_type,aggregate_id,payload,idempotency_key)
    select organization_id,'SGSTI_REMINDER','SGSTI_ACTIVITY',occurrence_id,
      jsonb_build_object('recipientId',responsible_id,'notificationType',notification_type,'title',case when notification_type='ACTIVITY_OVERDUE' then 'Atividade SGSTI em atraso' else 'Lembrete de atividade SGSTI' end,'body',format('%s: %s. Prazo: %s.',full_name,title,to_char(due_at,'DD/MM/YYYY')),'targetPath','/portal/sgsti?activity='||occurrence_id::text),
      format('SGSTI_REMINDER:%s:%s:%s',occurrence_id,notification_type,target_day)
    from reminder_candidates
    on conflict(organization_id,idempotency_key) do nothing
    returning id
  ) select count(*) into inserted_count from inserted;
  return inserted_count;
end; $$;

create or replace function public.deliver_sgsti_notification(target_event_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare event_record public.outbox_events%rowtype; recipient uuid; notification_kind text; notification_title text; notification_body text; notification_path text;
begin
  perform public.assert_outbox_worker();
  select * into event_record from public.outbox_events where id=target_event_id and event_type='SGSTI_REMINDER';
  if event_record.id is null then raise exception 'SGSTI_NOTIFICATION_EVENT_NOT_FOUND'; end if;
  recipient := (event_record.payload->>'recipientId')::uuid;
  notification_kind := event_record.payload->>'notificationType'; notification_title := event_record.payload->>'title'; notification_body := event_record.payload->>'body'; notification_path := event_record.payload->>'targetPath';
  if recipient is null or notification_kind not in ('ACTIVITY_REMINDER','ACTIVITY_OVERDUE','APPROVAL_PENDING') or coalesce(length(trim(notification_title)),0)<3 or coalesce(length(trim(notification_body)),0)<3 or notification_path not like '/portal/%' then raise exception 'SGSTI_NOTIFICATION_INVALID_PAYLOAD'; end if;
  insert into public.sgsti_notification_deliveries(outbox_event_id,organization_id,recipient_id,notification_type,title,body,target_path)
  values(event_record.id,event_record.organization_id,recipient,notification_kind,notification_title,notification_body,notification_path)
  on conflict(outbox_event_id) do nothing;
  insert into public.audit_logs(organization_id,action,entity_type,entity_id,after_value,source)
  values(event_record.organization_id,'SGSTI_NOTIFICATION_DELIVERED','sgsti_notification',target_event_id,jsonb_build_object('recipient_id',recipient,'notification_type',notification_kind),'WORKER');
end; $$;

create or replace function public.mark_sgsti_notification_read(target_notification_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.sgsti_notification_deliveries set read_at=coalesce(read_at,clock_timestamp()) where id=target_notification_id and recipient_id=auth.uid();
  if not found then raise exception 'SGSTI_NOTIFICATION_NOT_FOUND'; end if;
end; $$;

revoke all on function public.schedule_sgsti_reminders(date),public.deliver_sgsti_notification(uuid),public.mark_sgsti_notification_read(uuid) from public,authenticated,anon;
grant execute on function public.schedule_sgsti_reminders(date),public.deliver_sgsti_notification(uuid) to service_role;
grant execute on function public.mark_sgsti_notification_read(uuid) to authenticated;
