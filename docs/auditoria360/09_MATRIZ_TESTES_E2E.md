# Matriz de testes E2E e homologação

| Cenário | Pré-condição | Resultado esperado | Estado |
|---|---|---|---|
| Login/logout | usuário ativo | sessão criada e revogada | Contrato automatizado; navegador pendente |
| Segregação organizacional | duas organizações | nenhum acesso cruzado | Banco real pendente |
| Despacho | chamado e técnico ativos | agenda, OS, histórico e status atualizados | Contratos; E2E pendente |
| Conflito de agenda | técnico ocupado | despacho bloqueado com motivo | Contrato parcial; banco real pendente |
| Técnico móvel | acesso temporário válido | check-in, evidências, assinatura e checkout | Contratos; dispositivo pendente |
| Devolução | OS concluída | motivo obrigatório e nova revisão | Automatizado em contrato |
| BM | OS fechadas e LPU | cálculo congelado e memória detalhada | Contratos; provedor pendente |
| E-mail | conta autorizada | fila, claim, resultado e auditoria | Worker/provedor pendente |
| Retry | timeout após submissão | uma única operação efetiva | Parcial; concorrência PostgreSQL pendente |
| RTO | OS aprovada | PDF imutável e download auditado | Testes automatizados |

## Regra

Teste de contrato não substitui teste de jornada em banco, navegador, dispositivo ou provedor externo.
