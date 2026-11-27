alter table public.tickets add column if not exists sla_policy_id uuid references public.service_level_policies(id) on delete restrict;
create index if not exists tickets_sla_policy_idx on public.tickets(sla_policy_id);
create or replace function public.snapshot_ticket_service_level() returns trigger language plpgsql security definer set search_path = public as $$
declare selected_policy public.service_level_policies%rowtype;
begin
  if new.contract_id is null then return new; end if;
  if new.sla_policy_id is not null then
    select * into selected_policy from public.service_level_policies where id = new.sla_policy_id and organization_id = new.organization_id and contract_id = new.contract_id and priority = new.priority and active;
    if selected_policy.id is null then raise exception 'TICKET_SLA_POLICY_INVALID'; end if;
  else
    select * into selected_policy from public.service_level_policies where organization_id = new.organization_id and contract_id = new.contract_id and priority = new.priority and active limit 1;
  end if;
  if selected_policy.id is null then return new; end if;
  insert into public.ticket_service_levels(ticket_id, policy_id, priority, response_minutes, resolution_minutes, ola_minutes, response_due_at, resolution_due_at, ola_due_at)
  values (new.id, selected_policy.id, new.priority, selected_policy.response_minutes, selected_policy.resolution_minutes, selected_policy.ola_minutes, new.opened_at + make_interval(mins => selected_policy.response_minutes), new.opened_at + make_interval(mins => selected_policy.resolution_minutes), new.opened_at + make_interval(mins => selected_policy.ola_minutes));
  return new;
end; $$;
