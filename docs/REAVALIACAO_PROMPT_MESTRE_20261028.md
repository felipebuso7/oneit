# Reavaliação do Prompt Mestre e plano de execução — 2026-10-28

## Escopo e método

Este documento confronta os requisitos do `One_IT_Prompt_Mestre_Reconstrucao.md` com o estado versionado do repositório `servicia-fsm`, os testes existentes e os registros de auditoria anteriores. A classificação distingue evidência executada de inferência estática. A existência de uma rota ou componente não foi considerada prova de funcionamento ponta a ponta.

Não foram feitas alterações destrutivas, migrations ou alterações de dados nesta reavaliação.

## Parecer executivo

**Direção recomendada:** continuar com o monólito modular Next.js + Supabase/PostgreSQL e consolidar o portal autenticado como fonte operacional. Não há evidência que justifique microsserviços ou uma reescrita total.

**Situação atual:** a base de produção tem uma fronteira portal/demo, contratos de domínio e migrations para o fluxo de Field Service, RTO e BM. A prontidão operacional ainda é **parcial**, porque não foi comprovada neste ciclo uma jornada autenticada completa com dados persistidos, dois escopos organizacionais, provedor de WhatsApp/e-mail e geração de BM enviada.

## Matriz de pendências do Prompt Mestre

| Frente | Estado | Evidência atual | Próxima ação |
|---|---|---|---|
| Fonte de verdade portal vs. demo | Parcial, com gate | `src/app/page.tsx` direciona produção para `/portal`; `src/proxy.ts` bloqueia `/demo` em produção; páginas demo ainda usam `localStorage` | Manter demo somente para prévia explícita e executar smoke test no portal publicado |
| Cadastros e relacionamentos | Parcial | APIs/migrations existem para clientes, localidades, técnicos, catálogo e LPU; contratos do catálogo confirmam portal autenticado, escopo organizacional, itens ativos e revalidação dos consumidores, mas CRUD/seletores ainda não foram homologados em banco remoto | Homologar CRUD + seleção dependente em sequência, começando por técnico |
| Despacho Field Service | Parcial | `dispatch`, agenda, elegibilidade e testes contratuais existem; o endpoint foi ajustado para não exigir que um dispatcher insira uma tabela administrativa protegida por RLS quando o vínculo legado está ausente; não houve E2E autenticado comprovado no ciclo registrado | Testar atribuição, conflito de agenda, status e histórico em banco real |
| Link do técnico externo | Parcial | há `partner/access`, token/code gate e eventos; validade, revogação e upload dependem de homologação real | Testar token expirado/revogado, retomada e isolamento por OS |
| Evidências e assinatura | Parcial | rotas de upload, storage e testes existem; provedor/storage real e limites de payload precisam de prova operacional | Executar upload de 3 fotos, assinatura, consulta e controle de acesso |
| Validação, precificação e RTO | Parcial/implementada em código | `review`, LPU lines, geração RTO e fechamento têm funções e testes; o RTO é gerado antes do fechamento definitivo, embora o snapshot contenha `ticket_closed_at`; fluxo autenticado real não foi completado | Definir transação final para que o PDF preserve o horário real de fechamento sem quebrar a imutabilidade |
| BM por competência | Parcial | APIs, PDF, totais, congelamento e e-mail/fiscal possuem migrations/testes; worker e envio real ainda não comprovados | Homologar elegibilidade, idempotência, snapshot e fila de e-mail |
| LPU e composição | Parcial | `field_service_lpu_items` e `field_service_order_lpu_lines` persistem unidade, quantidade e preço congelado; o fluxo ainda não possui uma entidade de composição multi-item (mão de obra + materiais) | Validar o modelo atual com itens independentes; só criar composição após definir regra contratual e impacto no BM |
| Segurança/RLS | Aberta | RBAC/RLS e migrations existem; teste de duas organizações em banco real ainda não foi concluído | Executar matriz owner/admin/dispatcher/financeiro/técnico/externo |
| Integrações WhatsApp/e-mail | Não comprovada | abertura de conversa e contratos de fila existem; não há evidência de provedor oficial/entrega | Configurar sandbox autorizado e distinguir preparado, aceito, falho e entregue |
| UI/UX e design system | Parcial | portal usa shell claro e telas RTO/revisão foram refinadas; inventário visual global continua aberto | Revisar fila de chamados, despacho, validação e BM com critérios de tarefa |
| Testes E2E e produção | Parcial | suíte contratual e typecheck/build tiveram ciclos aprovados; E2E autenticado completo e Linux/VPS ainda não comprovados | Criar roteiro repetível com dados fictícios e evidências de rede/banco |

## O que não foi iniciado ou ainda está sem evidência suficiente

1. Homologação ponta a ponta autenticada na implantação exata publicada.
2. Teste de segregação entre duas organizações diretamente no banco e nas APIs.
3. Prova do worker financeiro processando e-mail, retry, idempotência e vínculo BM–log.
4. Configuração e teste de provedor oficial de WhatsApp; abrir a janela do WhatsApp não equivale a envio confirmado.
5. Backup/restauração e operação Linux/VPS com rollback testado.
6. Benchmark com volume representativo e paginação validada nas listas operacionais.
7. Inventário visual de todas as rotas administrativas; não é seguro declarar uniformidade global apenas por inspeção de algumas telas.
8. RTO final ainda pode não conter `ticket_closed_at`: `generate_field_service_rto` grava o snapshot antes de `close_field_service_ticket`, que exige o PDF já persistido.

## Plano de ação priorizado

### Sprint A — Guardrails e fonte de verdade (iniciada)

- [x] Reforçar teste que varre API, portal autenticado, portal do técnico e componentes Field Service contra `localStorage`.
- [x] Reforçar teste contra importação de componentes/páginas demo pelos caminhos operacionais.
- [ ] Manter `/demo` acessível somente em desenvolvimento ou prévia explicitamente configurada.
- [ ] Registrar a URL/commit da implantação que será homologada.

Critério de conclusão: os testes de fronteira passam e nenhuma página produtiva grava estado operacional no navegador.

### Sprint B — Cadastros e fonte canônica

- [~] Contrato automatizado da fonte canônica de técnicos criado; ainda falta executar CRUD e despacho autenticados no Supabase.
- [ ] Executar CRUD de técnico interno e parceiro; verificar ativo/disponível, polos e seleção no despacho.
- [ ] Executar empresa → departamento → solicitante → chamado com filtros dependentes.
- [ ] Executar categoria → serviço → chamado.
- [ ] Executar LPU → item/composição → quantidade → preço congelado na OS.

Critério: cada registro criado aparece nos seletores corretos após recarregar e alterações não quebram históricos.

### Sprint C — Jornada Field Service

- [ ] Abrir chamado com referência externa e número OneIT.
- [ ] Despachar com agenda/conflito/status e histórico.
- [ ] Abrir link externo sem login, iniciar deslocamento, check-in, evidências e assinatura.
- [ ] Submeter, validar/devolver, precificar, gerar RTO e encerrar.

Critério: uma OS fictícia percorre todas as transições no Supabase, sem `localStorage`, com auditoria e documento consultável.

### Sprint D — BM e integrações

- [ ] Consolidar OS elegíveis por cliente/competência.
- [ ] Gerar snapshot, PDF detalhado e total consolidado.
- [ ] Processar fila de e-mail em sandbox, com idempotência/retry e log por BM.
- [ ] Validar transição fiscal somente após evidência do worker.

Critério: BM não duplica OS, congela valores, registra versão e não declara entrega sem evidência do provedor.

### Sprint E — Segurança, desempenho e operação

- [ ] Matriz de autorização multi-organização.
- [ ] Limites/paginação nas filas e relatórios.
- [ ] Backup/restauração e rollback em ambiente Linux.
- [ ] Monitoramento, health/readiness e procedimento de suporte.

Critério: riscos P0/P1 fechados ou explicitamente aceitos pelo Owner com evidência e plano de mitigação.

## Decisões que continuam dependentes do Owner

- Regra oficial de competência do BM (data do atendimento, aprovação, encerramento ou RTO).
- Exceções às três fotos e à assinatura.
- Provedor oficial de WhatsApp e política de retenção dos links externos.
- Destinatários/modelos de e-mail e diferença entre aceite e entrega.
- Política de backup e ambiente de produção definitivo.

## Alterações iniciadas neste ciclo

- `tests/production-persistence-boundary.test.ts`: o gate agora cobre também `src/app/(portal)`, `src/app/field-service` e rejeita importações de demo nos caminhos produtivos.
- `tests/technician-source-of-truth-contract.test.ts`: contrato estático da criação disponível, trigger de vínculo automático e resolução do técnico no despacho.
- `tests/field-validation-flow.test.ts`: a cobertura do fluxo de validação foi movida da tela demo para o portal persistente, evitando validar uma implementação que não é fonte operacional.
- `tests/service-catalog-portal-contract.test.ts`: contratos do catálogo autenticado cobrem ausência de `localStorage`/demo, escopo por organização, itens ativos nos seletores e revalidação da abertura de chamados.
- `src/app/api/field-service/dispatch/route.ts` e `tests/portal-field-dispatch-contract.test.ts`: removido o bloqueio indevido que tentava criar vínculo administrativo durante o despacho de um usuário dispatcher; vínculos inativos continuam bloqueando, mas vínculo legado ausente não impede o RPC transacional.
- O modelo LPU foi revisado: a linha da OS congela `lpu_code`, descrição, unidade, quantidade e preço unitário; composição de vários itens ainda é uma lacuna de produto, não uma falha a ser mascarada com dados locais.
- A sequência RTO → fechamento foi auditada: o fechamento grava `field_service_ticket_closures.closed_at`, mas não atualiza o snapshot/PDF já imutável. Essa decisão exige alteração transacional planejada, não um ajuste visual.
- Este documento: baseline executável para o plano de reconstrução, sem alterar dados ou migrations.

## Validação planejada

Executar primeiro o teste direcionado do gate, depois typecheck/lint do escopo afetado. A suíte completa e a homologação remota continuam obrigatórias antes de qualquer conclusão de produção.
## Correção aplicada nesta continuidade

A geração do BM foi endurecida: a checagem de itens LPU agora usa os mesmos joins e estados da consolidação final
(`service_orders.status = VALIDATED` e `tickets.administrative_status = CLOSED`), evitando criar BM vazio por contar
linhas de uma OS não elegível. A migration ainda precisa ser aplicada no Supabase antes de ser considerada ativa.

A transição do BM também passou a devolver o status efetivo de `billing_periods` após o RPC. Antes, a tela recebia apenas
`measurement_sheets` e mantinha visualmente o status anterior, mesmo quando a transição havia sido persistida.

## Correções financeiras adicionais registradas

As rotas produtivas de BM e fiscal passaram a validar explicitamente os papéis `SUPER_ADMIN`, `ORG_ADMIN`,
`MANAGER` e `FINANCE` antes de expor PDFs, linhas, totais, auditoria, contestações, histórico ou logs de e-mail.
Essa autorização complementa o RLS e evita que um membro comum consulte dados financeiros por URL direta.

O próximo risco estrutural ainda aberto é a sequência RTO → fechamento: o fechamento registra o horário definitivo
de encerramento depois que o PDF já foi congelado. A correção exige uma decisão transacional sobre versão final do
RTO e hash do documento; não foi alterada nesta etapa.

## RTO e proteção documental

O download do RTO passou a exigir autorização explícita de gestão/financeiro, além da sessão e do escopo
organizacional. A visualização continua registrada em `audit_logs`. A geração permanece protegida pela função
transacional `generate_field_service_rto`; a decisão pendente é como emitir uma versão final com o horário de
fechamento definitivo sem alterar silenciosamente o PDF/hash aprovado.

