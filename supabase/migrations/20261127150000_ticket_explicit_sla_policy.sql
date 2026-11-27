alter table public.tickets add column if not exists sla_policy_id uuid references public.service_level_policies(id) on delete restrict;
create index if not exists tickets_sla_policy_idx on public.tickets(sla_policy_id);
create or replace function public.snapshot_ticket_service_level() returns trigger language plpgsql security definer set search_path = public as $$
declare selected_policy public.service_level_policies%rowtype;
begin
  if new.contract_id is null then return new; end if;
  if new.sla_policy_id is not null then
    select * into selected_policy from public.service_level_policies where id = new.sla_policy_id and organization_id = new.organization_id and contract_id = new.contract_id and priority = new.priority and active and (service_offering_id is null or service_offering_id = new.service_offering_id);
    if selected_policy.id is null then raise exception 'TICKET_SLA_POLICY_INVALID'; end if;
  else
    select * into selected_policy from public.service_level_policies where organization_id = new.organization_id and contract_id = new.contract_id and priority = new.priority and active and (service_offering_id is null or service_offering_id = new.service_offering_id) order by (service_offering_id is not null) desc limit 1;
  end if;
  if selected_policy.id is null then return new; end if;
  insert into public.ticket_service_levels(ticket_id, policy_id, calendar_id, priority, response_minutes, resolution_minutes, ola_minutes, response_due_at, resolution_due_at, ola_due_at)
  values (new.id, selected_policy.id, selected_policy.calendar_id, new.priority, selected_policy.response_minutes, selected_policy.resolution_minutes, selected_policy.ola_minutes, new.opened_at + make_interval(mins => selected_policy.response_minutes), new.opened_at + make_interval(mins => selected_policy.resolution_minutes), new.opened_at + make_interval(mins => selected_policy.ola_minutes));
  return new;
end; $$;

create or replace function public.list_eligible_ticket_sla_policies(target_organization_id uuid, target_customer_id uuid, target_contract_id uuid, target_service_offering_id uuid, target_priority smallint)
returns table(id uuid, contract_id uuid, service_offering_id uuid, calendar_id uuid, priority smallint, response_minutes integer, resolution_minutes integer, ola_minutes integer)
language sql security definer set search_path = public as $$
  select p.id, p.contract_id, p.service_offering_id, p.calendar_id, p.priority, p.response_minutes, p.resolution_minutes, p.ola_minutes
    from public.service_level_policies p join public.contracts c on c.id = p.contract_id and c.customer_id = target_customer_id and c.organization_id = target_organization_id and c.active
   where p.organization_id = target_organization_id and p.contract_id = target_contract_id and p.active and p.priority = target_priority
     and (p.service_offering_id is null or p.service_offering_id = target_service_offering_id) and public.is_organization_member(target_organization_id)
   order by (p.service_offering_id is not null) desc, p.id;
$$;
revoke all on function public.list_eligible_ticket_sla_policies(uuid,uuid,uuid,uuid,smallint) from public;
grant execute on function public.list_eligible_ticket_sla_policies(uuid,uuid,uuid,uuid,smallint) to authenticated;
