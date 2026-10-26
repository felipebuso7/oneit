alter table public.tickets add column closed_at timestamptz;
alter table public.tickets add constraint tickets_closure_timestamp check (
  (administrative_status = 'CLOSED' and closed_at is not null)
  or (administrative_status <> 'CLOSED' and closed_at is null)
);

create table public.ticket_closures (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references public.tickets(id) on delete restrict,
  report_id uuid not null references public.ticket_reports(id) on delete restrict,
  closed_by uuid not null references public.user_profiles(id) on delete restrict,
  closure_reason text not null check (length(trim(closure_reason)) between 10 and 2000),
  sync_exception_code text not null check (sync_exception_code = 'INTEGRATION_NOT_ENABLED'),
  sync_exception_reason text not null check (length(trim(sync_exception_reason)) between 10 and 2000),
  closed_at timestamptz not null default clock_timestamp()
);
alter table public.ticket_closures enable row level security;
create policy "read visible closures" on public.ticket_closures for select to authenticated
using (exists (select 1 from public.tickets t where t.id = ticket_id));

create or replace function public.close_ticket(
  target_ticket_id uuid, expected_version integer, target_report_id uuid,
  target_closure_reason text, target_exception_reason text, exception_acknowledged boolean
) returns uuid language plpgsql security definer set search_path = public as $$
declare ticket public.tickets%rowtype; report public.ticket_reports%rowtype;
  completion public.ticket_completions%rowtype; closure_id uuid; closed_time timestamptz := clock_timestamp();
begin
  select * into ticket from public.tickets where id = target_ticket_id for update;
  if ticket.id is null or not public.has_organization_role(ticket.organization_id, array['MANAGER','ORG_ADMIN','SUPER_ADMIN']::public.platform_role[])
    or not exists (select 1 from public.user_profiles where id = auth.uid() and active) then raise exception 'CLOSURE_NOT_AUTHORIZED'; end if;
  if expected_version is null or ticket.version <> expected_version then raise exception 'CLOSURE_VERSION_CONFLICT'; end if;
  if ticket.operational_status <> 'TECHNICALLY_COMPLETED' or ticket.administrative_status <> 'REPORT_GENERATED' then raise exception 'CLOSURE_INVALID_STATE'; end if;
  if exception_acknowledged is distinct from true then raise exception 'CLOSURE_EXCEPTION_REQUIRED'; end if;
  select * into report from public.ticket_reports where id = target_report_id and ticket_id = ticket.id;
  if report.id is null or report.report_version <> (select max(report_version) from public.ticket_reports where ticket_id = ticket.id) then raise exception 'CLOSURE_LATEST_REPORT_REQUIRED'; end if;
  select * into completion from public.ticket_completions where id = report.completion_id and ticket_id = ticket.id;
  if completion.id is null or not exists (select 1 from public.ticket_reviews where completion_id = completion.id and decision = 'APPROVE') then raise exception 'CLOSURE_APPROVAL_REQUIRED'; end if;
  if exists (select 1 from public.technicians where id = completion.technician_id and user_id = auth.uid()) then raise exception 'CLOSURE_SELF_APPROVAL_FORBIDDEN'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'ticket-reports' and name = report.storage_path) then raise exception 'CLOSURE_REPORT_MISSING'; end if;
  insert into public.ticket_closures(ticket_id, report_id, closed_by, closure_reason, sync_exception_code, sync_exception_reason, closed_at)
  values (ticket.id, report.id, auth.uid(), target_closure_reason, 'INTEGRATION_NOT_ENABLED', target_exception_reason, closed_time) returning id into closure_id;
  update public.tickets set administrative_status = 'CLOSED', closed_at = closed_time where id = ticket.id;
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_value, source)
  values (ticket.organization_id, auth.uid(), 'ADMINISTRATIVE_CLOSURE', 'ticket', ticket.id,
    jsonb_build_object('closure_id', closure_id, 'report_id', report.id, 'sync_exception_code', 'INTEGRATION_NOT_ENABLED', 'reason', target_closure_reason, 'exception_reason', target_exception_reason), 'WEB');
  return closure_id;
end;
$$;
revoke all on function public.close_ticket(uuid, integer, uuid, text, text, boolean) from public;
grant execute on function public.close_ticket(uuid, integer, uuid, text, text, boolean) to authenticated;
