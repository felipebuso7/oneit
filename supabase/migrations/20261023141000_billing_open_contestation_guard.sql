create or replace function public.prevent_approval_with_open_contestation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'APPROVED' and old.status is distinct from 'APPROVED' and exists (
    select 1 from public.measurement_contestations c where c.billing_period_id = new.id and c.status = 'OPEN'
  ) then
    raise exception 'billing_period_open_contestation';
  end if;
  return new;
end;
$$;

drop trigger if exists billing_period_open_contestation_guard on public.billing_periods;
create trigger billing_period_open_contestation_guard before update on public.billing_periods for each row execute function public.prevent_approval_with_open_contestation();
