# Catálogo de indicadores do ONEIT

Este catálogo descreve somente indicadores calculados a partir de registros persistidos e filtrados pelas organizações do usuário autenticado. Valores financeiros não são inferidos quando não há itens precificados.

| Indicador | Definição e fórmula | Fonte | Filtros / granularidade |
|---|---|---|---|
| Backlog aberto | Chamados cujo status operacional não é terminal (contagem) | `tickets.operational_status` | Organização; diária e por período |
| Entradas | Chamados com `opened_at` dentro do período | `tickets.opened_at` | Organização; período selecionado |
| Fechamentos | Chamados com fechamento administrativo no período | `tickets.closed_at`, `administrative_status=CLOSED` | Organização; período |
| Taxa de fechamento | fechamentos do período ÷ entradas do período × 100 | `tickets` | Organização; período. Não é coorte |
| Tempo médio até fechamento | média de `closed_at - opened_at` em horas | `tickets.opened_at/closed_at` | Apenas registros com as duas datas |
| Conformidade de resolução | fechamentos dentro da meta ÷ fechamentos com meta × 100 | `ticket_service_levels.resolution_due_at` | Organização; período |
| SLA vencido | Meta de resolução vencida no momento da consulta | `ticket_service_levels` | Organização; status ativo |
| OS agendadas / em campo | Contagem por status operacional | `tickets.operational_status` | Organização; instantâneo |
| Chamados por prioridade e etapa | Contagem agrupada por `priority` e `operational_status` | `tickets` | Organização; instantâneo |
| Ativos em operação/manutenção/baixados | Contagem por status do ativo | `assets.status` | Organização; instantâneo |
| Exportação de encerrados | Registros fechados com identificadores e classificação | `/api/tickets/export` | Permissão por organização; CSV rastreável |

## Indicadores ainda não calculados

Tempo de deslocamento, distância, visitas improdutivas, primeira visita, receita por contrato/cliente, rentabilidade e custos só devem ser exibidos quando houver eventos de geolocalização, itens LPU e valores persistidos suficientes. Até lá, a interface deve mostrar `—` ou “sem dados”, nunca zero ou valor estimado.

## Rastreabilidade e acesso

As páginas `/portal/dashboard` e `/portal/operational-reports` aplicam o escopo pelas organizações presentes em `user_roles`. A exportação de chamados encerrados usa o mesmo escopo e é privada (`Cache-Control: private, no-store`). Para BI externo, consumir o CSV autenticado ou criar uma integração com credencial própria; não expor chave de serviço no navegador.
