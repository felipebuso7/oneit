-- Mantém o cadastro administrativo e o cadastro usado no despacho sincronizados.
-- A operação continua usando public.technicians como identidade da OS; o registro
-- Field Service é criado/atualizado automaticamente para não depender de botão manual.

-- Corrige o trigger de integridade legado para que ele não tente resolver o
-- campo de polo quando o registro disparador é um técnico.
create or replace function public.assert_field_service_operational_mapping_integrity()
returns trigger language plpgsql set search_path = public as $$
declare mapped_organization_id uuid;
begin
  if tg_table_name = 'field_service_technicians' then
    if (to_jsonb(new)->>'operational_technician_id') is not null then
      select organization_id into mapped_organization_id from public.technicians where id = (to_jsonb(new)->>'operational_technician_id')::uuid;
      if mapped_organization_id is null or mapped_organization_id <> (to_jsonb(new)->>'organization_id')::uuid then
        raise exception 'FIELD_SERVICE_TECHNICIAN_ORGANIZATION_MISMATCH';
      end if;
    end if;
  elsif tg_table_name = 'field_service_polos' then
    if (to_jsonb(new)->>'operational_location_id') is not null then
      select organization_id into mapped_organization_id from public.customer_locations where id = (to_jsonb(new)->>'operational_location_id')::uuid;
      if mapped_organization_id is null or mapped_organization_id <> (to_jsonb(new)->>'organization_id')::uuid then
        raise exception 'FIELD_SERVICE_POLO_ORGANIZATION_MISMATCH';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.sync_field_service_technician_master()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_email text := lower(coalesce(new.email, 'tecnico-' || left(new.id::text, 8) || '@oneit.local'));
begin
  update public.field_service_technicians
     set name = new.full_name,
         email = target_email,
         phone = new.phone,
         technician_type = case when new.employment_type ~* '(parceir|extern)' then 'partner' else 'internal' end,
         active = new.active,
         updated_at = now()
   where organization_id = new.organization_id
     and operational_technician_id = new.id;

  if not exists (
    select 1 from public.field_service_technicians
     where organization_id = new.organization_id
       and operational_technician_id = new.id
  ) then
    update public.field_service_technicians
       set operational_technician_id = new.id,
           name = new.full_name,
           email = target_email,
           phone = new.phone,
           technician_type = case when new.employment_type ~* '(parceir|extern)' then 'partner' else 'internal' end,
           active = new.active,
           updated_at = now()
     where id = (
       select id from public.field_service_technicians
        where organization_id = new.organization_id
          and operational_technician_id is null
          and lower(email) = target_email
        limit 1
     );

    if not found then
      insert into public.field_service_technicians
        (organization_id, name, email, technician_type, phone, operational_technician_id, active)
      values
        (new.organization_id, new.full_name, target_email,
         case when new.employment_type ~* '(parceir|extern)' then 'partner' else 'internal' end,
         new.phone, new.id, new.active)
      on conflict (organization_id, email) do update
        set operational_technician_id = excluded.operational_technician_id,
            name = excluded.name,
            phone = excluded.phone,
            technician_type = excluded.technician_type,
            active = excluded.active,
            updated_at = now()
        where public.field_service_technicians.operational_technician_id is null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists technicians_field_service_master_sync on public.technicians;
create trigger technicians_field_service_master_sync
after insert or update of organization_id, full_name, email, phone, employment_type, active
on public.technicians
for each row execute function public.sync_field_service_technician_master();

-- Reconcilia registros existentes sem remover nem recriar dados.
update public.field_service_technicians field
   set operational_technician_id = tech.id,
       name = tech.full_name,
       email = lower(coalesce(tech.email, 'tecnico-' || left(tech.id::text, 8) || '@oneit.local')),
       phone = tech.phone,
       technician_type = case when tech.employment_type ~* '(parceir|extern)' then 'partner' else 'internal' end,
       active = tech.active,
       updated_at = now()
  from public.technicians tech
 where field.organization_id = tech.organization_id
   and field.operational_technician_id is null
   and lower(field.email) = lower(coalesce(tech.email, 'tecnico-' || left(tech.id::text, 8) || '@oneit.local'));

insert into public.field_service_technicians
  (organization_id, name, email, technician_type, phone, operational_technician_id, active)
select tech.organization_id, tech.full_name,
       lower(coalesce(tech.email, 'tecnico-' || left(tech.id::text, 8) || '@oneit.local')),
       case when tech.employment_type ~* '(parceir|extern)' then 'partner' else 'internal' end,
       tech.phone, tech.id, tech.active
  from public.technicians tech
 where not exists (
   select 1 from public.field_service_technicians field
    where field.organization_id = tech.organization_id
      and (field.operational_technician_id = tech.id
        or lower(field.email) = lower(coalesce(tech.email, 'tecnico-' || left(tech.id::text, 8) || '@oneit.local')))
 )
on conflict (organization_id, email) do nothing;
