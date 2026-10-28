-- Recupera o último rascunho/submissão do próprio acesso temporário para
-- que uma atualização do celular não obrigue o técnico a refazer o atendimento.
create or replace function public.get_partner_service_order_draft(target_token text, target_code text)
returns table(execution_report text, evidence jsonb, customer_signature_name text, customer_signature_data_url text)
language plpgsql security definer set search_path=public as $$
declare
  access_record public.service_order_partner_accesses%rowtype;
begin
  access_record := public.assert_partner_access(target_token, target_code);
  return query
    select submission.execution_report,
      coalesce(submission.evidence, '[]'::jsonb),
      submission.customer_signature_name,
      submission.customer_signature_data_url
    from public.service_order_partner_submissions submission
    where submission.partner_access_id = access_record.id
      and (submission.submitted_at is not null or submission.checked_in_at is not null)
    order by coalesce(submission.submitted_at, submission.checked_in_at, submission.created_at) desc
    limit 1;
end;
$$;

revoke all on function public.get_partner_service_order_draft(text, text) from public;
grant execute on function public.get_partner_service_order_draft(text, text) to anon;
