# Matriz preliminar de segurança das APIs

## Classes de acesso

| Classe | Exemplos | Controle esperado | Estado |
|---|---|---|---|
| Público operacional | `/api/health`, `/api/ready` | não expor dados sensíveis | Implementado; validar headers em proxy |
| OIDC | `/api/auth/oidc/*` | state, callback e sessão | Contratos presentes; provedor real pendente |
| Sessão autenticada | chamados, técnicos, LPU, revisão, relatórios | sessão + organização + papel/RPC | Contratos presentes; RLS real pendente |
| Acesso parceiro | `/api/field-service/partner/*` | token/código temporário, expiração, tentativa e OS vinculada | Parcial; homologar concorrência e revogação |
| Worker interno | `/api/internal/billing-email/*`, outbox | segredo de worker, método e payload limitados | Contratos presentes; operação real pendente |

## Evidências inspecionadas

- Fechamento de chamado exige mesma origem, JSON limitado, sessão e RPC de autorização.
- Sincronização de material exige mesma origem, sessão e `ownerId` igual ao usuário autenticado.
- Rotas financeiras distinguem fila pública de confirmação interna do worker.
- Rota partner não deve ser tratada como login geral; seu escopo é uma OS temporária.

## Testes obrigatórios ainda pendentes

1. Chamada sem sessão para cada endpoint autenticado deve retornar 401.
2. Usuário da organização A não pode consultar ou alterar registros da organização B.
3. Worker sem segredo ou com segredo inválido deve retornar 401/403 sem mutação.
4. Token partner expirado, revogado ou reutilizado deve ser rejeitado.
5. Reenvio concorrente não pode duplicar evento, medição ou e-mail.

## Conclusão

A inspeção textual não encontrou evidência suficiente para declarar as APIs inseguras, mas também não comprova segregação real. A validação decisiva depende de execução contra banco e ambiente de integração.
