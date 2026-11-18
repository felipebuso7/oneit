-- A aprovação gerencial só pode ocorrer depois que a OS tiver uma composição
-- de preço persistida. O trigger protege também chamadas diretas à API/RPC.
create or replace function public.require_field_service_lpu_before_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'APPROVED'::public.field_service_review_status
     and old.status is distinct from new.status
     and not exists (
       select 1 from public.field_service_order_lpu_lines
       where service_order_id = new.service_order_id
     ) then
    raise exception 'FIELD_REVIEW_LPU_REQUIRED';
  end if;
  return new;
end;
$$;

drop trigger if exists field_service_review_lpu_required on public.field_service_review_queue;
create trigger field_service_review_lpu_required
  before update of status on public.field_service_review_queue
  for each row execute function public.require_field_service_lpu_before_approval();

revoke all on function public.require_field_service_lpu_before_approval() from public;
