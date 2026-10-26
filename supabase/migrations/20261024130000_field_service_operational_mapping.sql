-- Convergência entre cadastros administrativos de Field e entidades operacionais da OS.
-- Os vínculos são opcionais durante a migração, porém únicos quando informados.

alter table public.field_service_technicians
  add column if not exists operational_technician_id uuid references public.technicians(id) on delete set null;

alter table public.field_service_polos
  add column if not exists operational_location_id uuid references public.customer_locations(id) on delete set null;

create unique index if not exists field_service_technicians_operational_technician_unique
  on public.field_service_technicians(operational_technician_id)
  where operational_technician_id is not null;

create unique index if not exists field_service_polos_operational_location_unique
  on public.field_service_polos(operational_location_id)
  where operational_location_id is not null;

create or replace function public.assert_field_service_operational_mapping_integrity()
returns trigger language plpgsql set search_path = public as $$
declare mapped_organization_id uuid;
begin
  if tg_table_name = 'field_service_technicians' and new.operational_technician_id is not null then
    select organization_id into mapped_organization_id from public.technicians where id = new.operational_technician_id;
    if mapped_organization_id is null or mapped_organization_id <> new.organization_id then
      raise exception 'FIELD_SERVICE_TECHNICIAN_ORGANIZATION_MISMATCH';
    end if;
  end if;

  if tg_table_name = 'field_service_polos' and new.operational_location_id is not null then
    select organization_id into mapped_organization_id from public.customer_locations where id = new.operational_location_id;
    if mapped_organization_id is null or mapped_organization_id <> new.organization_id then
      raise exception 'FIELD_SERVICE_POLO_ORGANIZATION_MISMATCH';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists field_service_technicians_operational_mapping_integrity on public.field_service_technicians;
create trigger field_service_technicians_operational_mapping_integrity
  before insert or update of organization_id, operational_technician_id on public.field_service_technicians
  for each row execute function public.assert_field_service_operational_mapping_integrity();

drop trigger if exists field_service_polos_operational_mapping_integrity on public.field_service_polos;
create trigger field_service_polos_operational_mapping_integrity
  before insert or update of organization_id, operational_location_id on public.field_service_polos
  for each row execute function public.assert_field_service_operational_mapping_integrity();
