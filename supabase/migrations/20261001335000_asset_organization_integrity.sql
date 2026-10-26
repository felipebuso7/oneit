create or replace function public.validate_asset_organization_links()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.asset_types asset_type
    where asset_type.id = new.asset_type_id
      and asset_type.organization_id = new.organization_id
  ) then
    raise exception 'ASSET_TYPE_ORGANIZATION_MISMATCH';
  end if;

  if new.department_unit_id is not null and not exists (
    select 1 from public.organization_units unit
    where unit.id = new.department_unit_id
      and unit.organization_id = new.organization_id
      and unit.unit_type = 'DEPARTMENT'
      and unit.active
  ) then
    raise exception 'ASSET_DEPARTMENT_INVALID';
  end if;

  return new;
end;
$$;

create trigger assets_validate_organization_links
before insert or update of organization_id, asset_type_id, department_unit_id on public.assets
for each row execute function public.validate_asset_organization_links();
