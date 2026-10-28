-- A aprovação não pode ser apenas uma mudança de status: deve existir uma
-- submissão persistida do parceiro ou uma conclusão interna com execução.
-- O trigger protege também futuras RPCs/caminhos administrativos que alterem a fila.
create or replace function public.guard_field_service_review_submission()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'APPROVED' and old.status is distinct from new.status then
    if new.submission_id is null and not exists (
      select 1
        from public.ticket_completions completion
        join public.ticket_execution_records execution
          on execution.id = completion.execution_record_id
       where completion.ticket_id = new.ticket_id
    ) then
      raise exception 'FIELD_REVIEW_SUBMISSION_REQUIRED';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists field_service_review_submission_guard on public.field_service_review_queue;
create trigger field_service_review_submission_guard
  before update of status on public.field_service_review_queue
  for each row execute function public.guard_field_service_review_submission();

revoke all on function public.guard_field_service_review_submission() from public;
