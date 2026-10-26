-- Resolve contestação e competência como uma única operação atômica.
create or replace function public.resolve_measurement_contestation(
  target_contestation_id uuid,
  target_decision text,
  target_resolution text,
  target_actor uuid default null
) returns public.measurement_contestations
language plpgsql
security invoker
set search_path = public
as $$
declare
  contestation public.measurement_contestations;
  period public.billing_periods;
begin
  if target_decision not in ('ACCEPTED', 'REJECTED') then raise exception 'invalid_contestation_decision'; end if;
  if length(trim(target_resolution)) < 10 then raise exception 'contestation_resolution_too_short'; end if;

  select * into contestation from public.measurement_contestations where id = target_contestation_id for update;
  if not found then raise exception 'contestation_not_found'; end if;
  if not public.has_organization_role(contestation.organization_id, array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]) then raise exception 'contestation_resolution_forbidden'; end if;
  if contestation.status <> 'OPEN' then raise exception 'contestation_already_resolved'; end if;

  select * into period from public.billing_periods where id = contestation.billing_period_id for update;
  if not found then raise exception 'billing_period_not_found'; end if;
  if period.status <> 'SENT_FOR_CONTESTATION' then raise exception 'billing_period_transition_conflict'; end if;

  update public.measurement_contestations
     set status = 'RESOLVED', resolution = trim(target_resolution), resolved_at = now(), resolved_by = target_actor
   where id = contestation.id;
  update public.billing_periods
     set status = case when target_decision = 'ACCEPTED' then 'CONTESTED'::public.measurement_status else 'APPROVED'::public.measurement_status end
   where id = period.id;

  select * into contestation from public.measurement_contestations where id = target_contestation_id;
  return contestation;
end;
$$;

comment on function public.resolve_measurement_contestation(uuid, text, text, uuid) is 'Resolve contestação e transiciona a competência de forma atômica.';
