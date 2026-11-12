# Revisão contextual e paginação

29/10/2026.

## Entregue no checkout

- A próxima ação da fila abre `/portal/review?order=<id da OS>`.
- A revisão valida o formato do identificador e restringe as três consultas (pendentes, aprovadas e devolvidas) à OS e às organizações autorizadas. Mantém RLS e verificação de papel.
- OS indisponível não expõe dados nem retorna silenciosamente todos os registros. Há retorno explícito à fila completa.
- A fila completa possui paginação estável de 50 itens por situação, com desempate por ID e contagens exatas do banco. Uma página percorre os três conjuntos simultaneamente; se um deles terminar antes, os demais continuam paginando.
- As revisões legadas ficam fora dos contadores de Field Service e não aparecem na consulta de uma OS específica. A deduplicação consulta os vínculos oficiais, em vez de depender apenas da página atual.
- RTOs são consultados por versão decrescente para a apresentação priorizar a versão mais recente.

## Arquivos

`src/app/(portal)/portal/review/page.tsx`, `src/components/tickets/tickets-table.tsx`, `src/lib/field-service/review-navigation.ts`, `tests/review-navigation.test.ts`.

## Validação

32 testes locais aprovados em review-navigation, ticket-field-progress e field-stage-metrics. Os testes cobrem parâmetros e regras/consultas simuladas; não são homologação da página no banco real. TypeScript, ESLint dos arquivos alterados e diff-check aprovados.

## Pendências

Preservar o filtro de OS após todas as ações de formulário (redirecionamentos atuais ainda retornam à fila geral); paginar a revisão legada, ainda limitada a 50; homologar acessos entre organizações e contagens com volume; verificar visualmente a versão executada. Não houve migration, alteração de dados ou deploy nesta etapa.
