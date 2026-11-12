# Ciclo — distinguir agendamento e execução

29/10/2026.

## Correção

O dashboard incluía ASSIGNED em “Em campo”; a central incluía DISPATCHED. Agora ambos usam `src/domain/dashboard/field-stage.ts`: agendamento é separado de deslocamento/chegada/execução. Estados desconhecidos não são interpretados como execução.

- `src/domain/dashboard/metrics.ts`: expõe `scheduled`, corrige `field` e exclui CLOSED do backlog e dos indicadores derivados de chamados abertos.
- `src/app/(portal)/portal/dashboard/page.tsx`: mostra agendados separadamente.
- `src/app/(portal)/portal/field-service/dispatch-workspace.tsx`: mostra agendadas separadamente, preserva compromissos na agenda conhecida e renomeia a lista mista para “Visitas agendadas e em campo”.
- `tests/field-stage-metrics.test.ts`: equivalência de classificação entre modelos, estados desconhecidos, cancelamento, revisão e registros fechados com status operacional defasado.

## Evidência

21 testes aprovados em três arquivos: field-stage-metrics, routes-agenda-ui-contract e portal-navigation. Testes locais, sem banco remoto. `git diff --check`, `tsc --noEmit` e ESLint dos cinco arquivos envolvidos aprovados.

## Limites e continuidade

Não houve migration, publicação ou validação visual nesta rodada. A classificação compartilhada não unifica as fontes: dashboard usa chamados e central usa OS, com limites de consulta diferentes. Totais ainda podem divergir. Ficam pendentes agregação/paginação no servidor, atualização da próxima ação após validação/RTO e harmonização dos gráficos derivados. A mudança não declara esses itens concluídos.
