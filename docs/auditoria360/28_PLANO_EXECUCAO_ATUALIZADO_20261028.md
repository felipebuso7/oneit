# Plano de execução atualizado — 28/10/2026

## 1. Leitura do planejamento mestre

O documento mestre organiza a reconstrução em sete fases: auditoria, arquitetura-alvo, fundação técnica, cadastros, chamado/despacho/atendimento, precificação/RTO e BM. A definição de pronto exige comportamento real, persistência, permissões no backend, estados de erro/sucesso, testes executados e documentação atualizada.

O repositório já ultrapassou a etapa de especificação em alguns pontos, mas isso não significa que todas as fases estejam homologadas. A implementação atual deve ser tratada como uma base de estabilização do portal autenticado, não como prova de produção pronta.

## 2. Estado confirmado por evidência

| Área | Estado | Evidência |
|---|---|---|
| Portal autenticado | Implementado | `src/app/(portal)/portal/*`, `src/proxy.ts` e commits da branch `prep/cloud-staging`. |
| `/demo` | Isolado | `src/proxy.ts`; permanece demonstrativo e usa `localStorage`. |
| Cadastro/seleção de solicitante | Corrigido no portal | `src/components/tickets/ticket-create-flow.tsx` e documentação `25_SOLICITANTE_CONFIGURACOES_VALIDACAO_20261027.md`. |
| Despacho Field Service | Implementado com validação de técnico | `dispatch-workspace.tsx`, `technician-eligibility.ts`, API `/api/field-service/dispatch`. |
| Link seguro do parceiro | Implementado | `/field-service/partner/access` e API de acesso temporário. |
| Retorno para validação | Implementado no modelo canônico | `field_service_review_queue` e `src/app/(portal)/portal/review`. |
| RTO/fechamento | Implementado em código e migration aditiva | `field_service_ticket_closures` e funções de fechamento/RTO; cenário autenticado ainda não foi executado. |
| WhatsApp | Preparação de conversa | Link pré-preenchido e registro explícito de que abertura não comprova entrega. Provedor oficial não configurado. |
| BM/e-mail fiscal | Parcial | UI e contratos existem; worker/provedor, entrega e bloqueio fiscal transacional ainda não foram comprovados. |
| Qualidade local | Parcial | `npm run typecheck`, lint direcionado e auditoria de migrations passam; Vitest/build local sofrem bloqueio `EPERM` do ambiente Windows. |

## 3. Direcionamento das próximas tarefas

### Sprint S2 — Continuidade do chamado e validação (P1)

1. Concluir a homologação autenticada do fluxo `abertura → despacho → técnico → checkout → validação → RTO → encerramento` com dados fictícios.
2. Capturar, em cada transição, resposta HTTP, ID, status persistido e auditoria.
3. Validar devolução para correção, retry e concorrência; não duplicar OS, fila ou RTO.
4. Confirmar o comportamento do dossiê: chamado tecnicamente concluído aparece como **Aguardando validação** e leva diretamente à fila `/portal/review`.

Entrega desta rodada: o dossiê autenticado agora exibe esse estado e a ação contextual `Validar OS` (`src/app/(portal)/portal/tickets/[id]/page.tsx`).

### Resultado do ciclo de estabilização 2026-10-28

- Abertura de chamado: o formulário agora bloqueia submissão sem organização, serviço, cliente e localidade (`c5b2cad`).
- Despacho: técnicos ativos sem vínculo legado podem ser recuperados com segurança no primeiro despacho; vínculos inativos continuam bloqueados (`e13f4be`).
- Validação: a fila oficial de Field Service não duplica mais chamados exibidos no fluxo legado (`d31fb9e`).
- Financeiro: destinatários de BM/fiscal agora são normalizados e deduplicados antes da validação e do enfileiramento, evitando rejeição por capitalização (`queue-email/route.ts`).
- Suíte: 106 arquivos e 223 testes aprovados; typecheck aprovado.
- A publicação foi confirmada em produção pelo endpoint `/api/version`, mas a homologação autenticada com dados reais de teste ainda não foi executada.

### Sprint S3 — Segurança e integridade de dados (P0/P1)

1. Testar RLS/RBAC com duas organizações e usuários com papéis distintos.
2. Validar upgrade em cópia restaurada, especialmente histórico de migrations e funções de fechamento.
3. Confirmar idempotência e bloqueio de dupla conclusão.
4. Registrar evidência reproduzível no relatório de homologação.

### Sprint S4 — BM e comunicações (P1)

1. Definir executor do worker financeiro e estado de cada tentativa.
2. Fechar o vínculo entre lote fiscal e cada BM antes de aplicar qualquer correção de banco.
3. Testar fila, retry, anexo, versão congelada e destinatários em sandbox.
4. Distinguir aceitação do provedor de entrega/abertura pelo destinatário.

### Sprint S5 — UX operacional e acessibilidade (P2)

1. Capturar as rotas autenticadas reais; não usar somente telas `/demo`.
2. Padronizar fila, revisão, filtros, estados vazios e ações contextuais.
3. Verificar menu, mapa e tabelas em desktop, notebook e mobile.

## 4. Critérios de avanço

Uma tarefa só será marcada como concluída quando houver:

- alteração pequena e rastreável;
- typecheck/lint direcionado executados;
- teste automatizado ou roteiro manual reproduzível;
- confirmação de persistência e permissão no ambiente adequado;
- documentação atualizada;
- limitações externas explicitadas.

## 5. Riscos e limites atuais

- O ambiente local Windows bloqueia parte do build/teste com `EPERM`; isso não é evidência de aprovação do build.
- A branch contém o código, mas a publicação Vercel precisa ser confirmada pelo commit efetivamente implantado.
- WhatsApp e e-mail ainda não têm prova de entrega em provedor real.
- O banco Free de homologação não substitui backup e recuperação testados para produção.
- Nenhuma migration destrutiva ou exclusão de dados é necessária para esta etapa.

## 6. Próxima ação executável

Executar o roteiro autenticado da Sprint S2 em homologação, com um usuário gestor e dados fictícios. Se o ambiente não permitir automação de navegador, registrar a limitação e validar contratos/API em isolamento, sem declarar o fluxo ponta a ponta como aprovado.
