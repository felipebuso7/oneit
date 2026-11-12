# Auditoria de arquitetura frontend/backend

## Arquitetura encontrada

Next.js App Router concentra UI, server actions e API routes; Supabase é autenticação, PostgreSQL e storage. O domínio é modular por diretórios, mas o portal ainda contém muitas áreas ITSM/SGSTI e Field Service no mesmo aplicativo.

## Pontos fortes

- API de readiness diferencia `legacy`, `supabase` e `self_hosted` (`src/app/api/ready/route.ts:10-54`).
- APIs de LPU filtram `organization_id` e suportam inativação (`src/app/api/field-service/lpu/route.ts`, `[id]/route.ts`).
- RPCs de composição, revisão e parceiro centralizam regras transacionais.
- Testes e typecheck passam.

## Riscos

- Persistência local é aceitável somente em `/demo`; qualquer importação acidental no portal seria regressão crítica.
- Contratos de API e estados de ticket/OS precisam ser documentados como máquina de estados única.
- Integrações externas têm endpoints, mas não há prova de entrega.
- Falhas de upload e PDF devem ser observáveis por request id e logs sem dados sensíveis.

## Recomendação

Manter monólito modular, separar `domain/application/infrastructure` progressivamente, usar RPC para transições críticas, schemas Zod nos limites, idempotency keys em comandos e eventos auditáveis. Não introduzir microserviços nesta escala.
