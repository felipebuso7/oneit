create or replace function public.prevent_closed_fiscal_batch_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'CLOSED' and (new.status, new.total_amount, new.competence, new.measurement_sheet_ids) is distinct from (old.status, old.total_amount, old.competence, old.measurement_sheet_ids) then
    raise exception 'closed_fiscal_batch_immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists fiscal_batch_immutability on public.fiscal_batches;
create trigger fiscal_batch_immutability before update on public.fiscal_batches for each row execute function public.prevent_closed_fiscal_batch_update();
