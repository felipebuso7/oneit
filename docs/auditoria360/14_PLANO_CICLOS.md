# Plano de execução dos ciclos de melhoria

## Ciclo 1 — Homologação de integridade e acesso (P0)

**Entrada:** cópia isolada do banco e variáveis de teste.  
**Atividades:** aplicar migrations em instalação limpa e upgrade; testar RLS/grants com duas organizações; validar sessões e escopos.  
**Saída:** relatório de queries, permissões e rollback.  
**Bloqueio:** não executar em produção.

O comando `npm run audit:migrations` fornece uma leitura estática dos prefixos duplicados e operações potencialmente destrutivas antes da conexão com o banco.

## Ciclo 2 — Jornada Field Service (P1)

**Entrada:** organizações, polos, técnicos, LPU e catálogo fictícios.  
**Atividades:** chamado → despacho → agenda → parceiro/técnico → evidências → assinatura → validação → RTO.  
**Saída:** evidência de status, IDs, timestamps, PDF e auditoria.  
**Critério:** devolução e retry não podem duplicar dados.

## Ciclo 3 — BM e e-mail (P1)

**Entrada:** OS fechadas e competência de teste.  
**Atividades:** cálculo, versão, prévia, fila, claim, envio sandbox, falha e retry.  
**Saída:** log imutável e confirmação distinta de aceite/entrega.  
**Bloqueio:** não usar destinatários reais.

## Ciclo 4 — UX e acessibilidade (P2)

**Entrada:** capturas reais das rotas autenticadas e standalone.  
**Atividades:** comparar shell, tabelas, formulários, Field Service e mobile em breakpoints.  
**Saída:** inventário de inconsistências e correções por lote.

## Ciclo 5 — Desempenho e operação (P1/P2)

**Entrada:** volume representativo e métricas habilitadas.  
**Atividades:** medir filas, dashboards, PDF, consultas e memória; testar restart, backup e restore.  
**Saída:** baseline, limites e decisão de tamanho da VPS.

## Regra de avanço

Um ciclo só é concluído quando possui evidência reproduzível, testes executados, riscos remanescentes e documentação atualizada.
