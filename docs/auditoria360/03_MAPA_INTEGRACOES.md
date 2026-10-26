# Mapa de integrações e dependências

## Relacionamentos centrais

| Origem | Destino | Evidência no repositório | Situação |
|---|---|---|---|
| Usuário | Organização/perfil | `user_roles`, `requireUser`, APIs administrativas | Implementado em contrato; RLS real não homologado |
| Chamado | OS/Field Service | rotas de tickets, dispatch, review e RTO | Implementado parcialmente; E2E real pendente |
| OS | Técnico/agenda | dispatch, scheduling, routes, partner access | APIs existem; disponibilidade/rota real não comprovadas |
| OS | Evidências/assinatura | partner upload/event/context e PDF RTO | Contratos/testes existem; armazenamento real pendente |
| OS | LPU/BM | linhas LPU, measurement/fiscal | Regras existem; cálculo real com contrato ainda precisa homologação |
| BM | E-mail fiscal | queue-email, claim/result e email-log | Fila e auditoria existem; worker externo não localizado |
| Dashboard | Operação | páginas dashboard e consultas de portal | Fontes/fórmulas não catalogadas centralmente |
| SGSTI | documentos/ações | APIs SGSTI e telas demo | Parte da persistência é local/demo; segregação precisa ser explícita |

## Integrações externas

- Supabase: cliente e migrations presentes; falta teste de RLS/grants em duas organizações.
- Self-hosted: scripts e readiness presentes; compatibilidade completa não demonstrada.
- WhatsApp: link pré-preenchido com telefone validado; isso não comprova entrega.
- E-mail: contratos de fila e resultado; provedor OAuth/SMTP real não configurado nesta auditoria.
- Mapas/roteirização: não foi encontrada evidência de cálculo real de distância/ETA no fluxo auditado.

## Riscos de propagação

1. Alteração de status pode atualizar OS, chamado e agenda em momentos diferentes se não ocorrer na mesma transação.
2. Dashboard pode apresentar valores divergentes se usar consultas diferentes da fila operacional.
3. BM pode ser fechado sem worker confirmado se a homologação não verificar o log fiscal correto.

## Próxima validação

Criar uma matriz de teste com duas organizações, dois técnicos e uma competência, verificando IDs, status, auditoria e permissões em cada transição.
