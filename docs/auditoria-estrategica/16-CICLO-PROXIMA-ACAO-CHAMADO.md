# Ciclo — próxima ação após execução em campo

29/10/2026.

## Implementação

- A fila consulta a OS mais recente por chamado e, para OS VALIDATED, a versão mais recente do RTO.
- COMPLETED apresenta “Validar OS”; VALIDATED sem caminho de PDF apresenta “Gerar RTO”; VALIDATED com caminho registrado apresenta “Encerrar chamado”. As ações levam à revisão gerencial, sem executar a decisão automaticamente.
- Etapas possuem filtros próprios. Não é oferecido novo agendamento/cancelamento pela linha quando existe pendência de validação, RTO ou fechamento identificada. Chamados CLOSED não oferecem agendamento.
- Consultas usam o cliente autenticado e RLS, em lotes de 100 chamados e páginas de 500 registros de histórico. Erros são explícitos, sem fallback local ou sucesso presumido.
- Não modifica status, permissões, documentos nem dados do banco.

## Arquivos

`src/lib/field-service/ticket-progress.ts`, `ticket-progress-query.ts`, `src/app/(portal)/portal/tickets/page.tsx`, `src/components/tickets/tickets-table.tsx`, `tests/ticket-field-progress.test.ts`.

## Validação e limites

29 testes aprovados em três arquivos (ticket-field-progress, field-stage-metrics, portal-navigation), com consultas simuladas. TypeScript, ESLint e diff-check aprovados. Ainda não houve teste E2E/RLS real, validação visual ou publicação desta alteração.

O caminho registrado do PDF não comprova que o objeto está acessível no Storage; isso permanece responsabilidade da validação de download/fechamento. A fila de revisão ainda tem limite de 50 registros por estado; o link leva à fila, não garante foco no cartão de um registro antigo. Paginação/foco contextual e unificação das fontes dos indicadores continuam pendentes. A consulta principal de chamados conserva o limite existente de 500.
