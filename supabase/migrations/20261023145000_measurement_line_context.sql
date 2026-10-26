alter table public.measurement_sheet_lines add column if not exists service_date date;
alter table public.measurement_sheet_lines add column if not exists service_location text;
alter table public.measurement_sheet_lines add column if not exists order_reference text;
create index measurement_lines_context_idx on public.measurement_sheet_lines(measurement_sheet_id, service_date, service_location);
