-- Fila persistente para OS concluídas pelo fluxo de acesso do técnico parceiro.
-- Esta fila não substitui ticket_completions: ela mantém a rastreabilidade do
-- modelo service_orders até que os dados possam ser normalizados com segurança.
create type public.field_service_review_status as enum ('PENDING', 'APPROVED', 'RETURNED');

create table public.field_service_review_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  service_order_id uuid not null unique references public.service_orders(id) on delete restrict,
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  submission_id uuid references public.service_order_partner_submissions(id) on delete restrict,
  status public.field_service_review_status not null default 'PENDING',
  reviewer_id uuid references public.user_profiles(id) on delete set null,
  review_reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check ((status = 'PENDING' and reviewer_id is null and reviewed_at is null) or (status <> 'PENDING' and reviewer_id is not null and reviewed_at is not null)),
  check (review_reason is null or length(trim(review_reason)) between 10 and 2000)
);

create index field_service_review_queue_org_status_idx
  on public.field_service_review_queue(organization_id, status, created_at);
create index field_service_review_queue_ticket_idx
  on public.field_service_review_queue(ticket_id, created_at desc);

alter table public.field_service_review_queue enable row level security;
create policy "managers read field service review queue"
  on public.field_service_review_queue for select to authenticated
  using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','DISPATCHER']::public.platform_role[]));
create policy "managers update field service review queue"
  on public.field_service_review_queue for update to authenticated
  using (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]))
  with check (public.has_organization_role(organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[]));

create or replace function public.enqueue_completed_field_service_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare latest_submission uuid;
begin
  if new.status = 'COMPLETED' and old.status is distinct from new.status then
    select id into latest_submission
      from public.service_order_partner_submissions
      where partner_access_id in (
        select id from public.service_order_partner_accesses where service_order_id = new.id
      )
      order by coalesce(checked_out_at, submitted_at, checked_in_at, created_at) desc
      limit 1;

    insert into public.field_service_review_queue(organization_id, service_order_id, ticket_id, submission_id)
    values (new.organization_id, new.id, new.ticket_id, latest_submission)
    on conflict (service_order_id) do update
      set submission_id = excluded.submission_id,
          status = case when field_service_review_queue.status = 'RETURNED' then 'PENDING'::public.field_service_review_status else field_service_review_queue.status end,
          reviewer_id = case when field_service_review_queue.status = 'RETURNED' then null else field_service_review_queue.reviewer_id end,
          review_reason = case when field_service_review_queue.status = 'RETURNED' then null else field_service_review_queue.review_reason end,
          reviewed_at = case when field_service_review_queue.status = 'RETURNED' then null else field_service_review_queue.reviewed_at end;
  end if;
  return new;
end;
$$;

create trigger service_orders_enqueue_review
  after update of status on public.service_orders
  for each row execute function public.enqueue_completed_field_service_order();

revoke all on function public.enqueue_completed_field_service_order() from public;

create or replace function public.review_field_service_order(
  target_queue_id uuid,
  target_decision text,
  target_reason text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare item public.field_service_review_queue%rowtype;
begin
  select * into item
    from public.field_service_review_queue
    where id = target_queue_id
    for update;

  if item.id is null then raise exception 'FIELD_REVIEW_NOT_FOUND'; end if;
  if not public.has_organization_role(item.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[])
    or not exists (select 1 from public.user_profiles where id = auth.uid() and active) then
    raise exception 'FIELD_REVIEW_NOT_AUTHORIZED';
  end if;
  if item.status <> 'PENDING' then raise exception 'FIELD_REVIEW_INVALID_STATE'; end if;
  if target_decision not in ('APPROVE', 'RETURN') then raise exception 'FIELD_REVIEW_INVALID_DECISION'; end if;
  if target_reason is null or length(trim(target_reason)) not between 10 and 2000 then raise exception 'FIELD_REVIEW_REASON_REQUIRED'; end if;

  update public.field_service_review_queue
    set status = case when target_decision = 'APPROVE' then 'APPROVED'::public.field_service_review_status else 'RETURNED'::public.field_service_review_status end,
        reviewer_id = auth.uid(), review_reason = trim(target_reason), reviewed_at = clock_timestamp()
    where id = item.id;

  if target_decision = 'APPROVE' then
    update public.service_orders set status = 'VALIDATED', updated_by = auth.uid() where id = item.service_order_id and status = 'COMPLETED';
  end if;

  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values (item.organization_id, auth.uid(), 'FIELD_SERVICE_REVIEW', 'service_order', item.service_order_id,
    jsonb_build_object('queue_id', item.id, 'decision', target_decision, 'reason', trim(target_reason)), 'WEB');
  return item.id;
end;
$$;

revoke all on function public.review_field_service_order(uuid, text, text) from public;
grant execute on function public.review_field_service_order(uuid, text, text) to authenticated;
