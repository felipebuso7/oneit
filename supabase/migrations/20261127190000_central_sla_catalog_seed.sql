-- Evolução segura do catálogo: políticas antigas continuam preservadas,
-- enquanto novos SLAs podem ser cadastrados sem contrato no momento do cadastro.
alter table public.service_level_policies alter column contract_id drop not null;
create unique index if not exists service_level_policies_org_name_uidx on public.service_level_policies(organization_id, lower(name));
create or replace function public.snapshot_ticket_service_level() returns trigger language plpgsql security definer set search_path=public as $$
declare policy public.service_level_policies%rowtype;
begin
  if new.contract_id is null then return new; end if;
  select * into policy from public.service_level_policies where contract_id=new.contract_id and priority=new.priority and active limit 1;
  if policy.id is null then return new; end if;
  insert into public.ticket_service_levels(ticket_id,policy_id,priority,response_minutes,resolution_minutes,ola_minutes,response_due_at,resolution_due_at,ola_due_at)
  values(new.id,policy.id,new.priority,policy.response_minutes,policy.resolution_minutes,policy.ola_minutes,new.opened_at+make_interval(mins=>policy.response_minutes),new.opened_at+make_interval(mins=>policy.resolution_minutes),new.opened_at+make_interval(mins=>policy.ola_minutes));
  return new;
end; $$;
-- Carga inicial idempotente: só cria nomes ausentes e não altera configurações existentes.
insert into public.service_level_policies(organization_id,contract_id,name,duration_value,duration_unit,priority,response_minutes,resolution_minutes,ola_minutes,active)
select o.id,null,v.name,v.amount,v.unit,3,v.minutes,v.minutes,v.minutes,true
from public.organizations o
cross join (values
 ('SLA 30 Minutos',30,'MINUTES',30),('SLA 2 horas',2,'HOURS',120),('SLA 4 horas',4,'HOURS',240),('SLA 8 horas',8,'HOURS',480),('SLA 12 horas',12,'HOURS',720),('SLA 24 horas',24,'HOURS',1440),('SLA 48 horas',48,'HOURS',2880),('SLA 72 horas',72,'HOURS',4320),('30 Dias',30,'DAYS',43200)
) v(name,amount,unit,minutes)
where not exists(select 1 from public.service_level_policies p where p.organization_id=o.id and lower(p.name)=lower(v.name));
