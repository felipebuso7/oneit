alter table public.measurement_sheet_lines add column if not exists line_kind text not null default 'LPU' check (line_kind in ('LPU','EXTRA','DISCOUNT','ADJUSTMENT'));
alter table public.measurement_sheet_lines add column if not exists source_reference text;
create index measurement_lines_kind_idx on public.measurement_sheet_lines(measurement_sheet_id, line_kind);
