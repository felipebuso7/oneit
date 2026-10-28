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
| UI/UX e design system | Parcial | portal usa shell claro e telas RTO/revisão foram refinadas; inventário visual global continua aberto | Revisar fila de chamados, despacho, validação e BM com critérios de tarefa; reduzir densidade do dashboard |
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

## Validação local desta etapa

`npm run typecheck`, `lint:field-service`, `lint:finance` e `git diff --check` passaram. O `npm run build`
alcançou o Next.js, mas foi bloqueado pelo Windows com `EPERM` ao remover `.next/server/app/portal/field-service`;
isso é uma limitação do ambiente local e não evidência de falha de compilação da aplicação. O build deve ser repetido
em CI/Linux ou após liberar o diretório `.next`. A repetição com `ONEIT_NEXT_DIST_DIR=.next-verify` reproduziu o
mesmo `EPERM` em outra pasta de saída, reforçando que o bloqueio é ambiental e não específico de uma rota.

O contrato `tests/field-service-rto-download-audit.test.ts` também foi ampliado para verificar explicitamente o
escopo organizacional e os quatro perfis autorizados. A execução direcionada não coletou testes porque o Vitest foi
bloqueado pelo Windows ao renomear um artefato temporário (`EPERM`); portanto, o teste permanece não validado nesta
máquina e deve ser executado em CI/Linux.

O endpoint de geração de RTO agora diferencia `RTO_FILE_ALREADY_REGISTERED` de uma indisponibilidade de storage e
responde `409` para uma tentativa de registrar outro arquivo sobre uma versão já persistida. Isso evita apresentar
um conflito de imutabilidade como falha temporária do servidor. O teste de contrato foi criado, mas sua execução
local também ficou bloqueada pelo `EPERM` do Vitest antes da coleta.

A tela de revisão passou a traduzir esse conflito para uma orientação operacional, indicando que o PDF existente deve
ser consultado em vez de repetir a geração. Typecheck, ESLint e verificação de whitespace passaram após a alteração.

O agendamento do portal foi alinhado ao mesmo contrato do despacho: a elegibilidade consulta `technicians` por
organização, ativo e disponibilidade, sem bloquear um cadastro operacional válido apenas porque o vínculo legado em
`field_service_technicians` ainda não foi materializado. O RPC continua sendo a autoridade transacional para estado e
conflitos; foi adicionado contrato estático para evitar regressão dessa regra.

Nesta continuidade, a abertura de chamados deixou de carregar subcategorias e serviços ativos de forma global. A página
`/portal/tickets` agora consulta categorias por organização, depois subcategorias pelos IDs dessas categorias e, por fim,
serviços pelos IDs das subcategorias. Isso reduz vazamento de opções entre organizações e evita que um serviço legítimo
seja exibido no formulário, mas rejeitado apenas no salvamento. O contrato `tests/service-catalog-portal-contract.test.ts`
passou a proteger essa cadeia de dependência.

Validação desta alteração: `npm run typecheck`, ESLint direcionado, `git diff --check` e o teste direcionado do catálogo
passaram localmente (7 testes). A suíte completa e o build continuam dependentes da validação CI/Linux registrada acima.

Também foram alinhadas as consultas administrativas do catálogo e de SLA: ambas usam a mesma cadeia categoria →
subcategoria → oferta e restringem os itens aos descendentes das organizações autorizadas. O teste direcionado passou a
cobrir os dois consumidores adicionais (8 testes aprovados).

Foi acrescentado o contrato `tests/field-service-end-to-end-contract.test.ts`, que verifica a sequência estrutural
despacho → acesso público do técnico → check-in/check-out → fila persistente de validação → RTO → encerramento. A
validação confirmou que o técnico conclui a `service_order` como `COMPLETED`, a fila gerencial é criada pelo trigger
`service_orders_enqueue_review` com estado `PENDING`, e o chamado só é encerrado após revisão, PDF e fechamento transacional.
O teste direcionado do fluxo passou com 5 testes aprovados.

Na frente financeira, a geração produtiva do BM foi validada por contrato: a função considera somente fechamentos
administrativos do Field Service dentro da competência, com OS `VALIDATED`, chamado `CLOSED`, linhas LPU persistidas,
snapshot, versão e evento de criação. O conjunto direcionado de medição, PDF, totais e workflow fiscal passou com 10
testes aprovados. Isso valida a estrutura do fluxo, mas não substitui uma execução contra um Supabase de homologação
com dados reais de teste e storage configurado.

Também foi executada a bateria de proteção operacional e persistência: auditoria de integridade do banco, limites das
filas de chamados, agendamento, OS e rotas, além dos gates de caminhos produtivos sem demo. Foram 5 arquivos e 10
testes aprovados. Os limites atuais evitam carregamento ilimitado, mas ainda não substituem paginação interativa para
grandes volumes; isso permanece como melhoria P2, sem bloquear uma homologação de baixo volume.

Na fila de chamados, a tabela foi estabilizada visualmente com `table-fixed`, largura mínima controlada e `colgroup`
explícito para as nove colunas. Cliente/local, título, serviço e ações agora têm limites previsíveis, com truncamento
ou quebra de texto controlados; isso evita que títulos longos empurrem o SLA e as ações para fora do alinhamento.
O contrato visual foi atualizado para a ação vigente “Agendar visita →”. Foram executados o teste direcionado da fila
(4 testes aprovados) e o typecheck; não houve alteração de dados, migration ou publicação em produção. A paginação
interativa permanece uma melhoria P2 separada.

A fila de chamados passou a paginar os registros recebidos no cliente em blocos de 25, com indicação de intervalo e
controles acessíveis de página anterior/próxima. A paginação não substitui o limite server-side: ela reduz o volume
renderizado por vez e mantém os filtros, ordenação e ações existentes. Testes da fila e dos limites server-side foram
executados (4 testes aprovados) e o typecheck passou.

Como refinamento, a ordenação pelos cabeçalhos da fila retorna à primeira página antes de aplicar a nova direção ou
coluna. Isso evita que uma ordenação com poucos resultados mantenha o gestor em uma página vazia; filtros continuam
protegidos pelo `safePage` para nunca renderizar uma página inexistente.

Na fila de chamados, busca, situação e ordenação agora também retornam explicitamente à primeira página. Isso evita
que o gestor aplique um filtro estando na página 2 ou 3 e receba uma lista aparentemente vazia. O contador da fila
passou a ser anunciado como região dinâmica (`aria-live`), mantendo retorno visual e acessível após cada filtro.
ESLint e typecheck passaram; os dois testes direcionados da fila foram bloqueados antes da coleta pelo mesmo `EPERM`
de rename temporário do Vitest no Windows, já registrado neste documento.

Na fila de validação gerencial, os cartões de OS pendente receberam um destaque lateral âmbar (`border-l-4`) para
separar visualmente itens que exigem decisão dos históricos aprovados/devolvidos. A alteração é exclusivamente visual:
não muda consultas, status, ações, LPU ou persistência. O teste direcionado de revisão/fluxo (3 testes) e o typecheck
foram executados com sucesso.

Na manutenção do catálogo, a atualização/inativação de categorias, subcategorias e ofertas passou a invalidar também
`/portal/sla`, assim como já ocorria na criação. Isso mantém os seletores de SLA coerentes imediatamente após editar ou
inativar um item, sem exigir hard refresh. O contrato do catálogo foi ampliado e passou com 9 testes.

Na Central Field Service, a fila de despacho passou a indicar visualmente o chamado selecionado com acento lateral,
estado acessível (`aria-current`) e transição discreta. O painel de planejamento agora explicita a sequência operacional
em três passos — selecionar, agendar e comunicar — sem alterar o contrato de despacho, a elegibilidade do técnico ou a
agenda. ESLint e typecheck passaram. Os contratos direcionados ficaram bloqueados antes da coleta pelo `EPERM` do
Vitest no Windows, sem indicar falha funcional do código.

Na fila de validação gerencial, cada OS pendente passou a ter nome acessível, e a área de decisão do gestor ganhou uma
hierarquia explícita: conferência obrigatória, justificativa e ações de aprovar/devolver. O conteúdo operacional, as
evidências, a assinatura e a composição LPU permanecem inalterados; foi apenas reduzida a ambiguidade visual sobre o
que está sendo validado e qual é o próximo passo. ESLint e typecheck passaram.

No painel de BM, o fluxo visual agora é apresentado em quatro etapas: fechar competência, validar BM, enviar ao cliente
e aguardar fiscal. Os status da tabela passaram a usar cores semânticas e bordas consistentes, mantendo a leitura rápida
sem alterar o workflow, os cálculos ou as permissões. ESLint e typecheck passaram.

No cadastro de técnicos, o formulário recebeu estrutura de seção, labels explícitos, mensagens de feedback acessíveis,
campos com linguagem operacional e espaçamento alinhado ao Design System. A edição, habilitação/indisponibilização e o
vínculo operacional permanecem iguais; a alteração reduz ambiguidade no cadastro que alimenta o despacho. ESLint e
typecheck passaram.

Na LPU, o formulário passou a explicar explicitamente a relação entre unidade, preço unitário e composição da OS. Ao
cancelar uma edição, os campos são limpos e o contexto retorna para novo cadastro, evitando reaproveitamento acidental
de valores antigos. A persistência, desativação/reativação e contratos de API foram preservados. ESLint e typecheck
passaram.

Na Central de Agendamento de OS, o seletor de técnico passou a explicar explicitamente que somente técnicos ativos da
organização do chamado são elegíveis. A ação principal de despacho agora permanece desabilitada até técnico, data e período
estarem preenchidos, evitando cliques sem efeito e tornando o próximo passo previsível. A validação de conflito, a criação da
OS, o link público e a comunicação pelo WhatsApp permanecem inalterados. ESLint direcionado e typecheck passaram.

O Catálogo de serviços também foi alinhado ao cabeçalho compartilhado do portal, com mensagem de feedback semântica e
editor de itens com bordas explícitas. A hierarquia de categoria, subcategoria e oferta, os filtros por organização e as
ações de criação, edição e inativação foram preservados; nenhuma regra de catálogo ou integração com a abertura de
chamados foi alterada. ESLint direcionado e typecheck passaram.

No cadastro de regiões, a tela foi alinhada ao shell do portal e movida visualmente para o contexto de Configurações ·
Field Service. O formulário agora explicita organização, nome e UF, e a listagem explica que a região é reutilizada em
polos, triagem e agenda. A alteração é visual e não muda o vínculo persistido da região. ESLint e typecheck passaram.

No cadastro de empresas e departamentos, a tela foi alinhada ao cabeçalho padrão do portal, com seção de criação,
labels semânticos, tipos de unidade destacados e ações de edição/inativação identificadas por registro. A edição inline
continua preservando a operação existente e a inativação segue mantendo o histórico. ESLint e typecheck passaram.

No cadastro de localidades e polos, a tela passou a explicitar a reutilização do endereço no chamado e no despacho,
organizar campos com labels, destacar cliente/cidade/endereço na listagem e separar visualmente edição e contato local.
Não foi introduzido campo novo nem alterada a persistência; o objetivo foi tornar a dependência já existente legível
para o usuário operacional. ESLint e typecheck passaram.

Na tela de Rotas planejadas, cada técnico passou a receber um acento lateral discreto e determinístico, facilitando a
leitura de várias agendas no mesmo dia sem transformar os cartões em um painel multicolorido. Também foi removida uma
variável sem uso da página e preservada a compatibilidade do movimento de descida de parada para versões antigas do
formulário que não enviavam o campo `direction`.

Na continuidade da auditoria visual, o dashboard autenticado deixou de apresentar quatorze KPIs no mesmo nível visual.
Os seis indicadores de decisão operacional permanecem em destaque; SLA, pausas e inventário foram preservados em uma
seção compacta de indicadores complementares. A alteração reduz carga cognitiva e espaço vertical sem remover dados ou
mudar fórmulas, permissões e consultas. A validação local passou por ESLint direcionado e `npm run typecheck`.

Na tela de Solicitantes e colaboradores, a interface legada escura foi alinhada ao shell claro do portal. O cabeçalho agora
usa o padrão compartilhado, os formulários e a tabela receberam superfícies, bordas, tipografia e ações consistentes, e os
campos de seleção ganharam rótulos acessíveis. A mudança é exclusivamente visual e de acessibilidade: não altera as ações,
consultas, vínculos organizacionais, validação de e-mails ou persistência dos colaboradores. ESLint direcionado e typecheck
passaram.

No portal público do técnico, a seção “Detalhes do chamado” passou a usar uma barra de título azul escura com texto branco,
reforçando a hierarquia das informações essenciais antes da execução. A jornada, os bloqueios por etapa, evidências,
assinatura e checkout permanecem com o mesmo comportamento e contrato de API. ESLint direcionado e typecheck passaram.

Na agenda do técnico interno, cada OS passou a ter acento lateral semântico, status destacado no cabeçalho e uma linha
resumida com data/hora agendada e próxima ação. A alteração reduz a carga de leitura antes do check-in sem modificar os
componentes de execução, evidências, materiais, pendências ou checkout. ESLint direcionado e typecheck passaram.

Na fila de validação gerencial, as mensagens de retorno passaram a ser regiões dinâmicas acessíveis (`aria-live`) com
superfície e contraste consistentes com o portal. A alteração não modifica a fila, a LPU, as decisões ou a geração do RTO.
ESLint direcionado e typecheck passaram.

O shell autenticado recebeu um comportamento responsivo para telas estreitas: a navegação lateral passa a ocupar uma coluna
compacta de ícones, com `title` e `aria-label` para preservar a descoberta das rotas, enquanto o conteúdo recalcula a margem
sem sobreposição. O menu expandido de desktop e suas rotas permanecem inalterados. ESLint direcionado, typecheck e `git diff
--check` passaram.

Na etapa seguinte, os módulos fora do escopo operacional atual foram ocultados da navegação: Inventário e Conhecimento
deixaram de aparecer no hub de Configurações e o item Ativos foi removido do menu legado de demonstração. As rotas e os
dados foram preservados; não houve exclusão de tabelas, APIs ou permissões. ESLint, typecheck e `git diff --check` passaram.

O build de produção foi revalidado após corrigir atributos de somente leitura nos diretórios gerados e de código do ambiente
Windows. `npm run build` concluiu com sucesso, compilando TypeScript e gerando 201 páginas. Essa evidência confirma a
integridade do artefato local, mas não substitui a confirmação de deploy na Vercel.

