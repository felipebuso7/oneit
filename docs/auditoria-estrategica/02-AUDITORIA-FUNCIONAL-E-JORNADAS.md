# Auditoria funcional e jornadas

## Jornada central AS-IS observada no domínio

Chamado → status `AWAITING_SCHEDULING` → agenda → técnico → eventos de campo → execução/evidências → conclusão técnica → `AWAITING_REVIEW` → revisão RPC → aprovação/devolução → RTO → BM.

Evidências: `20260930130000_tickets_foundation.sql`, `20260930132000_scheduling.sql`, `20260930133000_field_events.sql`, `20261001110000_execution_records.sql`, `20261001130000_completion_review.sql`.

## TO-BE recomendado

Uma central operacional deve manter o contexto do chamado e abrir despacho em painel lateral. A conclusão técnica nunca deve encerrar administrativamente; a aprovação do gestor é a única transição para `APPROVED/CLOSED`. LPU é aplicada apenas na revisão, com snapshot de preço.

## Jornadas

| Jornada | AS-IS | Fricção/risco | TO-BE | Validação |
|---|---|---|---|---|
| Cadastro de empresa + contatos | telas administrativas separadas | retrabalho e vínculos não evidentes | assistente contextual, sem duplicação | criar, recarregar, reutilizar no chamado |
| Técnico → despacho | `technicians` referenciado pelo ticket; histórico legado requer reconciliação | técnico pode não aparecer por filtro/vínculo | fonte canônica + elegibilidade explícita | criar/editar/ativar e despachar |
| Chamado → Field | várias superfícies portal/demo | mudança de contexto | ação “Atribuir visita” em detalhe | estado, agenda e auditoria |
| Técnico mobile | parceiro e autenticado têm caminhos distintos | conectividade/upload | timeline de estados e rascunho idempotente | eventos, evidências, assinatura, checkout |
| Review → RTO/BM | RPC de revisão e APIs existem | PDF/e-mail não totalmente comprovados | revisão com resumo, LPU, decisão e documento | aprovar/devolver/repetir sem duplicar |

## Exceções obrigatórias

Conflito de agenda, técnico inativo, chamada cancelada, duplicidade por retry, falha de upload, devolução para correção, acesso de parceiro expirado e tentativa cross-organization. Nenhuma dessas exceções deve ser considerada validada sem teste explícito.
