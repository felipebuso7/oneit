-- Congela a composição do BM quando a competência já foi enviada ao fiscal.
-- Contestação e recálculo continuam permitidos nos estados anteriores.
create or replace function public.prevent_locked_measurement_line_change()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  period_status public.measurement_status;
begin
  select p.status into period_status
    from public.measurement_sheets s
    join public.billing_periods p on p.id = s.billing_period_id
   where s.id = coalesce(new.measurement_sheet_id, old.measurement_sheet_id);

  if period_status in ('SENT_TO_TAX', 'CLOSED') then
    raise exception 'measurement_lines_locked_for_fiscal';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists measurement_lines_lock on public.measurement_sheet_lines;
create trigger measurement_lines_lock
before insert or update or delete on public.measurement_sheet_lines
for each row execute function public.prevent_locked_measurement_line_change();

create or replace function public.prevent_locked_measurement_summary_change()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  period_status public.measurement_status;
begin
  select p.status into period_status
    from public.measurement_sheets s
    join public.billing_periods p on p.id = s.billing_period_id
   where s.id = coalesce(new.measurement_sheet_id, old.measurement_sheet_id);

  if period_status in ('SENT_TO_TAX', 'CLOSED') then
    raise exception 'measurement_summary_locked_for_fiscal';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists measurement_summary_lock on public.measurement_sheet_summary;
create trigger measurement_summary_lock
before insert or update or delete on public.measurement_sheet_summary
for each row execute function public.prevent_locked_measurement_summary_change();
