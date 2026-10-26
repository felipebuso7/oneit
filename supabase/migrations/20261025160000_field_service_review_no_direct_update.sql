-- A fila deve ser alterada apenas pelas funções transacionais de revisão.
drop policy if exists "managers update field service review queue" on public.field_service_review_queue;

-- Não conceder UPDATE diretamente a authenticated. As funções review/generate
-- executam validações, lock e audit log com SECURITY DEFINER.
revoke update on public.field_service_review_queue from authenticated;
