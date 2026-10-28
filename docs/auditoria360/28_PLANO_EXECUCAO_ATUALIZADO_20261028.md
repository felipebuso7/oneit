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
- Financeiro: migration `20261028120000_defer_fiscal_batch_acceptance.sql` preparada para impedir que a criação do lote marque a competência como enviada antes da confirmação do e-mail fiscal; a promoção passa a ocorrer no evento `SENT` do worker.
- Financeiro: migration `20261028123000_allow_fiscal_batch_closure_context.sql` preparada para permitir o fechamento de cada BM quando o e-mail fiscal `SENT` pertence a um lote fiscal confirmado que contém o BM, mantendo organização e status como pré-condições.
- Fronteira de persistência: auditoria estática confirmou que APIs, serviços de Field Service e componentes do parceiro não usam `localStorage`; a única persistência temporária do parceiro é o token de `sessionStorage`, removido após a leitura.
- Suíte: 106 arquivos e 223 testes aprovados; typecheck aprovado.
- A publicação foi confirmada em produção pelo endpoint `/api/version`, mas a homologação autenticada com dados reais de teste ainda não foi executada.
- Agenda/rotas: corrigida a validação do parâmetro de data em `routes` e `scheduling`; a expressão anterior aceitava somente a sequência literal `\\d` e descartava qualquer dia informado. Regressão coberta por `tests/routes-agenda-ui-contract.test.ts`.
- Agenda/rotas: horários das paradas agora são formatados explicitamente no fuso `America/Sao_Paulo`, evitando deslocamento visual quando o runtime da hospedagem opera em UTC.

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

### Atualização de execução — 28/10/2026 (cadastro e despacho)

- O ciclo de técnicos foi reforçado no commit `341c990`: ao habilitar um técnico, o vínculo `field_service_technicians` é reativado; ao desativar, o status operacional passa a `UNAVAILABLE`; reativação de cadastro inativo retorna a `AVAILABLE`, enquanto edições sem mudança de ativação preservam estados como `BUSY`.
- A correção foi coberta por contratos automatizados e publicada em `https://oneit-omega.vercel.app`.
- Evidência de produção: `/api/version` retornou o commit `341c990c144dcc86525dfe2e406eb78c52031992`; `/api/ready` retornou `status=ready` e `deploymentMode=supabase`.
- Validação local: typecheck aprovado, build de produção aprovado, suíte completa com **111 arquivos / 237 testes aprovados**.
- Limitação: ainda não há homologação autenticada do ciclo completo com dados fictícios no Supabase nem teste real de provedor WhatsApp/e-mail; S2, S3 e S4 permanecem abertos.

### Atualização de execução — 28/10/2026 (integridade da validação)

- A migration aditiva `20261028154000_field_service_review_submission_guard.sql` foi aplicada no Supabase vinculado. A fila agora rejeita aprovação sem submissão persistida do parceiro ou execução interna com conclusão e registro de execução.
- A ação do portal traduz `FIELD_REVIEW_SUBMISSION_REQUIRED` para uma mensagem operacional, sem expor erro SQL ao gestor.
- Validações: auditoria estrita de migrations (180 migrations, sem alertas), typecheck, build e testes focados aprovados.
- Produção confirmada no commit `22fde44c0d61d08590ffea18bd09c67fcf91c001`; `/api/ready` retornou `status=ready` e `deploymentMode=supabase`.

### Atualização de execução — 28/10/2026 (smoke de produção e regressão)

- Smoke público repetido em `https://oneit-omega.vercel.app`: `/api/version` retornou `environment=production`, commit `22fde44c0d61d08590ffea18bd09c67fcf91c001` e deployment `oneit-5964cf4190-20261028055412`; `/api/ready` retornou `status=ready` e `deploymentMode=supabase`.
- Suíte completa executada após a guarda de aprovação: **112 arquivos / 240 testes aprovados**.
- A tela de login de produção respondeu e apresentou os campos de e-mail, senha, entrada e recuperação de senha. A jornada autenticada não foi marcada como aprovada nesta rodada porque não foi fornecida uma sessão de teste reutilizável para automação; portanto, abertura, despacho, checkout, aprovação, RTO e encerramento continuam pendentes de homologação autenticada.
- Não foi registrado envio real de WhatsApp ou e-mail: o smoke confirma disponibilidade da aplicação, não entrega em provedor externo.

### Atualização de execução — 28/10/2026 (jornada visual do técnico)

- A agenda autenticada `/portal/field` agora consulta `ticket_status_history` e exibe a jornada da OS em um componente único (`src/components/field/journey-timeline.tsx`): deslocamento, chegada, atendimento, evidências e checkout.
- A etapa de evidências informa a contagem persistida de fotos e destaca `3` como requisito operacional; a linha do tempo não altera status nem substitui as validações do backend.
- A agenda autenticada passou a liberar fotos e materiais somente após `WORK_STARTED` (antes, `ON_SITE` permitia abrir a seção antes do início formal do atendimento). Correção no commit `1502fe0`, validada por `tests/field-execution-gating.test.ts`, com typecheck e três testes focados aprovados.
- Validação: typecheck, build, teste focado e suíte completa aprovados (**113 arquivos / 241 testes**).
- Publicação confirmada no commit `6934e2d076dfaa0181f1c203b616b54d280c3af4`; `/api/ready` retornou `ready` com `deploymentMode=supabase`.

### Atualização de execução — 28/10/2026 (diagnóstico de técnicos no despacho)

- A central agora explica quando o seletor de técnicos está vazio e diferencia ausência de cadastro de indisponibilidade operacional, com atalho para o cadastro administrativo.
- `npx supabase migration list --linked` confirmou as migrations locais e remotas alinhadas, incluindo `20261027210000_auto_field_service_technician_mapping` e `20261028154000_field_service_review_submission_guard`.
- Regressão completa após a alteração: **114 arquivos / 242 testes aprovados**. Build e typecheck também aprovados.
- A melhoria foi publicada em produção no commit `7a709d186580ede698220d0da650a03725a69e5b`; `/api/ready` retornou `ready` com Supabase.

### Atualização de execução — 28/10/2026 (fronteira produção/demo)

- Smoke HTTP anônimo confirmou `/portal` e `/portal/field-service` respondendo `307` para `/login`, com `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` e `Permissions-Policy` presentes.
- A rota `/demo` respondeu `404` na implantação de produção, confirmando que a área demonstrativa não está sendo oferecida como operação pública nesse deployment.
- Esta verificação é de fronteira e segurança sem sessão; não substitui a homologação autenticada das transições operacionais.

### Atualização de execução — 28/10/2026 (lint SQL remoto)

- O `supabase db lint --linked --fail-on warning` encontrou erros reais em funções existentes: despacho com referência ambígua de sequência, claims do outbox com `id` ambíguo, geração de token parceiro sem qualificação da extensão, e chamadas SGSTI com enum tratado como escalar.
- As migrations aditivas `20261028161000_fix_remote_function_lint_errors.sql` e `20261028161100_fix_remaining_remote_lint_error.sql` corrigiram esses erros sem alterar ou remover dados.
- O lint remoto passou sem erros; permanecem apenas dois avisos legados não bloqueantes (nome de parâmetro reservado e parâmetro fiscal compatível mantido por contrato).
- Auditoria estrita: **182 migrations, nenhum alerta estático**. Suíte completa: **115 arquivos / 244 testes aprovados**. Typecheck aprovado.

### Atualização de execução — 28/10/2026 (contexto operacional congelado no RTO)

- A migration aditiva `20261028162000_field_service_rto_context_snapshot.sql` passou a congelar no snapshot do RTO o número e título do chamado, cliente, localidade, endereço, técnico e contato local, além dos dados operacionais já existentes (linha do tempo, relato, assinatura, evidências e composição LPU).
- O PDF do RTO passou a exibir uma seção `DADOS DO ATENDIMENTO` com esses campos, mantendo compatibilidade com relatórios antigos que não possuam os novos atributos.
- Validação: typecheck aprovado; suíte completa **124 arquivos / 254 testes aprovados**; build de produção aprovado; `supabase db push --linked --yes` aplicou somente a migration aditiva.
- Publicação confirmada em `https://oneit-omega.vercel.app`: `/api/version` retornou commit `1ecf844bd0eb6a423026fb9e85b8c398cc0f3f2a`, `environment=production`; `/api/ready` retornou `status=ready` e `deploymentMode=supabase`.
- Limitação mantida: ainda não há evidência de homologação autenticada ponta a ponta nem de entrega real por WhatsApp/e-mail; essa entrega melhora o dossiê do RTO, mas não encerra a Sprint S2.

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
