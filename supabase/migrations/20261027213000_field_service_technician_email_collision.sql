-- Garante que um e-mail duplicado em cadastros operacionais não impeça o
-- vínculo do técnico ao Field Service. O e-mail original permanece em
-- public.technicians; o fallback identifica apenas o cadastro mestre.

create or replace function public.sync_field_service_technician_master()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_email text := lower(coalesce(new.email, 'tecnico-' || left(new.id::text, 8) || '@oneit.local'));
begin
  if exists (
    select 1 from public.field_service_technicians field
     where field.organization_id = new.organization_id
       and lower(field.email) = target_email
       and field.operational_technician_id is distinct from new.id
  ) then
    target_email := 'tecnico-' || left(new.id::text, 8) || '@oneit.local';
  end if;

  update public.field_service_technicians
     set name = new.full_name, email = target_email, phone = new.phone,
         technician_type = case when new.employment_type ~* '(parceir|extern)' then 'partner' else 'internal' end,
         active = new.active, updated_at = now()
   where organization_id = new.organization_id and operational_technician_id = new.id;

  if not exists (select 1 from public.field_service_technicians where organization_id = new.organization_id and operational_technician_id = new.id) then
    insert into public.field_service_technicians
      (organization_id, name, email, technician_type, phone, operational_technician_id, active)
    values (new.organization_id, new.full_name, target_email,
      case when new.employment_type ~* '(parceir|extern)' then 'partner' else 'internal' end,
      new.phone, new.id, new.active)
    on conflict (organization_id, email) do nothing;
  end if;
  return new;
end;
$$;

update public.field_service_technicians field
   set operational_technician_id = tech.id,
       name = tech.full_name,
       phone = tech.phone,
       active = tech.active,
       updated_at = now()
  from public.technicians tech
 where field.organization_id = tech.organization_id
   and field.operational_technician_id is null
   and lower(field.email) = lower(coalesce(tech.email, 'tecnico-' || left(tech.id::text, 8) || '@oneit.local'));

insert into public.field_service_technicians
  (organization_id, name, email, technician_type, phone, operational_technician_id, active)
select tech.organization_id, tech.full_name,
       case when exists (
         select 1 from public.field_service_technicians duplicate
          where duplicate.organization_id = tech.organization_id
            and lower(duplicate.email) = lower(tech.email)
       ) then 'tecnico-' || left(tech.id::text, 8) || '@oneit.local'
       else lower(coalesce(tech.email, 'tecnico-' || left(tech.id::text, 8) || '@oneit.local')) end,
       case when tech.employment_type ~* '(parceir|extern)' then 'partner' else 'internal' end,
       tech.phone, tech.id, tech.active
  from public.technicians tech
 where tech.active
   and not exists (select 1 from public.field_service_technicians linked where linked.operational_technician_id = tech.id)
on conflict (organization_id, email) do nothing;
