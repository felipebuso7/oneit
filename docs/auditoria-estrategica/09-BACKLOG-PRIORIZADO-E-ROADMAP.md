# Backlog priorizado e roadmap

| ID | Onda | Tarefa | Prioridade | Aceite |
|---|---|---|---|---|
| B-001 | 0 | Teste E2E autenticado completo em staging | P0 | fluxo inteiro passa e registros persistem |
| B-002 | 0 | Matriz RLS/RBAC com dois tenants | P0 | nenhum acesso cruzado |
| B-003 | 0 | Instrumentar upload/PDF/e-mail com request id | P1 | falha diagnosticável sem dado sensível |
| B-004 | 1 | Inventário e canonicalização de técnicos | P1 | criar/editar/ativar aparece no despacho |
| B-005 | 1 | Consolidar solicitante/empresa/local/contrato | P1 | seleção dependente sem duplicação |
| B-006 | 1 | Documentar máquina de estados ticket/OS | P1 | transições inválidas bloqueadas |
| B-007 | 2 | Catálogo administrativo + consumidor | P1 | CRUD/inativação e uso no chamado |
| B-008 | 2 | LPU e snapshot de composição | P1 | preço histórico imutável |
| B-009 | 2 | RTO/BM com revisão e reprocessamento idempotente | P1 | PDF e BM auditáveis |
| B-010 | 3 | Design system e revisão Field Service | P2 | critérios WCAG/layout aprovados |
| B-011 | 4 | backup/restore e teste de carga | P1 | RPO/RTO medidos |

Dependência crítica: B-001/B-002 antes de declarar produção. B-004–B-009 dependem do modelo e dos testes de segurança. B-010 pode avançar em paralelo após contratos de dados estáveis.

## Status do ciclo iniciado em 28/10/2026

- B-004: **parcial**. Revisão confirmou sincronização já definida nas migrations `20261027210000` e `20261027213000`. O rascunho redundante `20261028230000` foi retirado sem aplicação. Corrigida a limpeza de campos opcionais na edição; 4 testes da action com banco simulado aprovados. Pendente consolidar escritas duplicadas nas actions e validar CRUD → despacho no banco publicado, incluindo colisão de e-mails e concorrência.
- Contenção de runtime: **implementada no código**. O portal de produção agora recusa `ONEIT_DEPLOYMENT_MODE` ausente ou `legacy`.
- B-001/B-002: **não iniciados**; continuam bloqueadores de homologação.
- Prontidão do Storage: **corrigida e testada localmente**. `/api/ready?storage=1` agora retorna HTTP 503 e `not_ready` quando o provedor falha. Não representa teste de gravação, nem validação de conectividade atual em produção.
