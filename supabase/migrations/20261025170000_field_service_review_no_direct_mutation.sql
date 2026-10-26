-- A fila é criada pelo trigger de conclusão e alterada pelas RPCs; não há
-- operação de INSERT/DELETE direta no fluxo de aplicação.
revoke insert, delete on public.field_service_review_queue from authenticated;
