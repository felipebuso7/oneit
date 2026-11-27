alter table public.service_level_policies
  add column if not exists name text,
  add column if not exists duration_value integer,
  add column if not exists duration_unit text;
update public.service_level_policies
set name = coalesce(name, 'SLA P' || priority), duration_value = coalesce(duration_value, resolution_minutes), duration_unit = coalesce(duration_unit, 'MINUTES')
where name is null or duration_value is null or duration_unit is null;
alter table public.service_level_policies alter column name set default 'Novo SLA';
alter table public.service_level_policies alter column name set not null;
alter table public.service_level_policies alter column duration_value set default 1;
alter table public.service_level_policies alter column duration_value set not null;
alter table public.service_level_policies alter column duration_unit set default 'MINUTES';
alter table public.service_level_policies alter column duration_unit set not null;
alter table public.service_level_policies drop constraint if exists service_level_policies_duration_ck;
alter table public.service_level_policies add constraint service_level_policies_duration_ck check (duration_value > 0 and duration_unit in ('MINUTES','HOURS','DAYS'));
alter table public.service_level_policies alter column priority set default 3;
alter table public.service_level_policies alter column response_minutes set default 1;
alter table public.service_level_policies alter column resolution_minutes set default 1;
alter table public.service_level_policies alter column ola_minutes set default 1;
