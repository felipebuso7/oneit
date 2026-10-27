-- Fechamento administrativo do fluxo de OS parceira. Preserva close_ticket,
-- ticket_completions e ticket_reports usados pelo fluxo ITSM anterior.
-- O SQL foi aplicado primeiro no oneit-staging pelo editor. A idempotência
-- permite registrar esta migration depois pelo pipeline sem recriar objetos.
create table if not exists public.field_service_ticket_closures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  ticket_id uuid not null unique references public.tickets(id) on delete restrict,
  service_order_id uuid not null unique references public.service_orders(id) on delete restrict,
  report_id uuid not null unique references public.field_service_rto_reports(id) on delete restrict,
  closed_by uuid not null references public.user_profiles(id) on delete restrict,
  closure_reason text not null check (length(trim(closure_reason)) between 10 and 2000),
  sync_exception_code text not null check (sync_exception_code = 'INTEGRATION_NOT_ENABLED'),
  sync_exception_reason text not null check (length(trim(sync_exception_reason)) between 10 and 2000),
  closed_at timestamptz not null default clock_timestamp()
);

alter table public.field_service_ticket_closures enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'field_service_ticket_closures' and policyname = 'members read field service closures') then
    create policy "members read field service closures"
      on public.field_service_ticket_closures for select to authenticated
      using (public.is_organization_member(organization_id));
  end if;
end $$;

create or replace function public.close_field_service_ticket(
  target_ticket_id uuid,
  expected_version integer,
  target_report_id uuid,
  target_closure_reason text,
  target_exception_reason text,
  exception_acknowledged boolean
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  ticket_record public.tickets%rowtype;
  order_record public.service_orders%rowtype;
  report_record public.field_service_rto_reports%rowtype;
  closure_id uuid;
  closed_time timestamptz := clock_timestamp();
begin
  select * into ticket_record from public.tickets where id = target_ticket_id for update;
  if ticket_record.id is null then raise exception 'FIELD_CLOSURE_TICKET_NOT_FOUND'; end if;
  if not public.has_organization_role(ticket_record.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER']::public.platform_role[])
    or not exists (select 1 from public.user_profiles where id = auth.uid() and active) then
    raise exception 'FIELD_CLOSURE_NOT_AUTHORIZED';
  end if;
  if expected_version is null or ticket_record.version <> expected_version then raise exception 'FIELD_CLOSURE_VERSION_CONFLICT'; end if;
  if ticket_record.closed_at is not null or ticket_record.administrative_status = 'CLOSED' then raise exception 'FIELD_CLOSURE_ALREADY_CLOSED'; end if;
  if target_closure_reason is null or length(trim(target_closure_reason)) not between 10 and 2000 then raise exception 'FIELD_CLOSURE_REASON_REQUIRED'; end if;
  if exception_acknowledged is distinct from true or target_exception_reason is null
    or length(trim(target_exception_reason)) not between 10 and 2000 then raise exception 'FIELD_CLOSURE_EXTERNAL_SYNC_EXCEPTION_REQUIRED'; end if;

  select * into order_record from public.service_orders
    where ticket_id = ticket_record.id and organization_id = ticket_record.organization_id for update;
  if order_record.id is null or order_record.status <> 'VALIDATED' or order_record.checked_out_at is null then
    raise exception 'FIELD_CLOSURE_ORDER_NOT_VALIDATED';
  end if;
  if not exists (select 1 from public.field_service_review_queue q
    where q.service_order_id = order_record.id and q.ticket_id = ticket_record.id
      and q.organization_id = ticket_record.organization_id and q.status = 'APPROVED') then
    raise exception 'FIELD_CLOSURE_REVIEW_REQUIRED';
  end if;
  if exists (select 1 from public.technicians t where t.id = order_record.technician_id and t.user_id = auth.uid()) then
    raise exception 'FIELD_CLOSURE_SELF_APPROVAL_FORBIDDEN';
  end if;

  select * into report_record from public.field_service_rto_reports
    where id = target_report_id and ticket_id = ticket_record.id
      and service_order_id = order_record.id and organization_id = ticket_record.organization_id for update;
  if report_record.id is null or report_record.storage_path is null or report_record.sha256 is null
    or not exists (select 1 from storage.objects where bucket_id = 'ticket-reports' and name = report_record.storage_path) then
    raise exception 'FIELD_CLOSURE_PDF_REQUIRED';
  end if;

  insert into public.field_service_ticket_closures
    (organization_id, ticket_id, service_order_id, report_id, closed_by, closure_reason,
      sync_exception_code, sync_exception_reason, closed_at)
  values (ticket_record.organization_id, ticket_record.id, order_record.id, report_record.id,
    auth.uid(), trim(target_closure_reason), 'INTEGRATION_NOT_ENABLED', trim(target_exception_reason), closed_time)
  returning id into closure_id;

  update public.tickets set operational_status = 'TECHNICALLY_COMPLETED',
    administrative_status = 'CLOSED', closed_at = closed_time
    where id = ticket_record.id;

  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values (ticket_record.organization_id, auth.uid(), 'FIELD_SERVICE_TICKET_CLOSED', 'ticket', ticket_record.id,
    jsonb_build_object('closure_id', closure_id, 'service_order_id', order_record.id,
      'report_id', report_record.id, 'report_sha256', report_record.sha256,
      'reason', trim(target_closure_reason), 'sync_exception_code', 'INTEGRATION_NOT_ENABLED',
      'sync_exception_reason', trim(target_exception_reason)), 'WEB');
  return closure_id;
end;
$$;

revoke all on function public.close_field_service_ticket(uuid, integer, uuid, text, text, boolean) from public;
revoke all on function public.close_field_service_ticket(uuid, integer, uuid, text, text, boolean) from anon;
grant execute on function public.close_field_service_ticket(uuid, integer, uuid, text, text, boolean) to authenticated;

-- A composição do PDF e o RTO fechado devem permanecer iguais ao que o
-- gestor aprovou. Mudanças posteriores exigirão uma revisão formal futura.
create or replace function public.guard_field_service_billing_snapshot()
returns trigger language plpgsql set search_path = public as $$
declare affected_order_id uuid;
begin
  affected_order_id := case when tg_op = 'DELETE' then old.service_order_id else new.service_order_id end;
  if exists (select 1 from public.field_service_rto_reports r
    where r.service_order_id = affected_order_id and r.storage_path is not null) then
    raise exception 'FIELD_LPU_PDF_ALREADY_GENERATED';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'field_service_lpu_freeze_after_pdf'
    and tgrelid = 'public.field_service_order_lpu_lines'::regclass) then
    create trigger field_service_lpu_freeze_after_pdf
      before insert or update or delete on public.field_service_order_lpu_lines
      for each row execute function public.guard_field_service_billing_snapshot();
  end if;
end $$;

create or replace function public.guard_closed_field_service_rto()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (select 1 from public.field_service_ticket_closures c where c.report_id = old.id) then
    raise exception 'FIELD_RTO_ALREADY_CLOSED';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'field_service_rto_freeze_after_closure'
    and tgrelid = 'public.field_service_rto_reports'::regclass) then
    create trigger field_service_rto_freeze_after_closure
      before update or delete on public.field_service_rto_reports
      for each row execute function public.guard_closed_field_service_rto();
  end if;
end $$;
