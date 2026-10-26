# Auditoria de indicadores e relatórios

## Situação

Existem dashboards, filas e relatórios, mas o catálogo formal de métricas ainda não está centralizado.

## Catálogo mínimo recomendado

| Indicador | Fonte necessária | Regra a formalizar |
|---|---|---|
| OS aguardando validação | fila de revisão | contar apenas fila pendente vigente |
| Tempo de atendimento | eventos de deslocamento/check-in/check-out | definir início e fim, incluindo pausas |
| SLA em risco | chamado + SLA | mesma fonte de prazo da fila |
| Retrabalho | devoluções para correção | contar revisões por OS, não cliques |
| Valor medido | linhas LPU + composição contratual | congelar versão do cálculo no BM |
| BM aguardando fiscal | estado da medição | excluir contestação resolvida |

## Gap comprovado

Não há evidência de que cada KPI possua fórmula, periodicidade, responsável e link para os registros de origem documentados em um único catálogo.

## Critério de aceite

Cada indicador deve exibir período, filtros, fonte, fórmula e permitir navegar para os registros que o compõem.
