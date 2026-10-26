-- Após o encaminhamento ao faturamento, linhas e totais do BM ficam congelados.
create or replace function public.prevent_locked_measurement_line_change()
returns trigger language plpgsql set search_path = public as $$
declare period_status public.measurement_status;
begin
  select p.status into period_status from public.measurement_sheets s join public.billing_periods p on p.id = s.billing_period_id where s.id = coalesce(new.measurement_sheet_id, old.measurement_sheet_id);
  if period_status in ('SENT_TO_TAX', 'SENT_TO_BILLING', 'CLOSED') then raise exception 'measurement_lines_locked_for_billing'; end if;
  return coalesce(new, old);
end; $$;

create or replace function public.prevent_locked_measurement_summary_change()
returns trigger language plpgsql set search_path = public as $$
declare period_status public.measurement_status;
begin
  select p.status into period_status from public.measurement_sheets s join public.billing_periods p on p.id = s.billing_period_id where s.id = coalesce(new.measurement_sheet_id, old.measurement_sheet_id);
  if period_status in ('SENT_TO_TAX', 'SENT_TO_BILLING', 'CLOSED') then raise exception 'measurement_summary_locked_for_billing'; end if;
  return coalesce(new, old);
end; $$;

