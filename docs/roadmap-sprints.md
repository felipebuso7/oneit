# Roadmap de sprints — Servicia FSM

## Marco atual — Sprint 2/3: cadastro LPU

Entrega incremental concluída no protótipo: o cadastro LPU agora diferencia material, mão de obra e deslocamento, valida código duplicado, mantém unidade padronizada e informa a quantidade de itens cadastrados. Esta entrega ainda usa armazenamento local da demonstração; a substituição por persistência Supabase, auditoria e RLS permanece como requisito da fundação antes do aceite de produção.

Evolução seguinte: empresas e polos passaram a rejeitar nomes duplicados no mesmo contexto; empresas também aceitam validação de CNPJ quando informada. A tela ainda precisa expor o campo de CNPJ e migrar a validação para o banco na etapa de persistência.

Próximo foco da Sprint 3: tornar a unidade da LPU obrigatória e visível em todas as seleções de despacho, além de transportar essa informação para materiais, RTO e boletim de medição sem conversões implícitas.

Fundação de persistência iniciada: a migration `20261023150000_field_service_master_data.sql` cria empresas, polos e itens LPU com organização, unicidade, vigência, índices e RLS. O aceite depende de aplicar a migration em Supabase e executar testes autenticados de segregação.

Sprint UI-01 iniciada: tokens visuais e componentes-base `.oneit-page-header`, `.oneit-card`, `.oneit-section-title` e `.oneit-btn` foram adicionados ao CSS global. A migração das páginas existentes será gradual para evitar regressões funcionais.

## Premissas

- Cadência sugerida: sprints de duas semanas, ajustável à capacidade do time.
- Cada sprint termina com código revisado, migrations versionadas, RLS revisada quando aplicável, lint, typecheck e testes pertinentes.
- Integrações externas ficam nos sprints 15 a 17. Antes disso, a operação deve funcionar com dados criados manualmente e adaptadores simulados.
- Dados comerciais seguem separados do app de campo; o técnico nunca recebe permissões de preço ou margem.

## Visão de entregas

Atualização de desenvolvimento — 05/10/2026: sincronização manual idempotente, inventário local de rascunhos de execução e fila de materiais implementados no código, descritos em [offline-execution-sync.md](offline-execution-sync.md) e [materials-evidences.md](materials-evidences.md). Sprint 9 segue parcial: faltam fotos offline, recuperação sem agenda local e homologação móvel/Supabase. Não considerar o aceite das sprints concluído pelos testes locais; migrations, RLS e fluxo autenticado continuam sem validação no ambiente de banco.

Sprint 13 iniciou com painel operacional e configuração inicial de SLA/OLA por contrato/prioridade. Novas OS com contrato e regra ativa recebem um snapshot de minutos corridos; o painel mostra metas de resolução ativas e vencidas e permite pausa/retomada manual versionada e auditada. Não há associação automática a pendências nem política implícita. Calendário comercial, alertas, escalonamento, resposta e OLA continuam pendentes; o painel não deve ser usado como indicador completo de SLA até essa evolução.

Fundação ITSM em evolução: o catálogo hierárquico categoria → subcategoria → oferta de serviço está modelado e administrável por organização. A migration também prepara o vínculo da OS a uma oferta, com validação de organização e snapshot de códigos. O vínculo ainda não é obrigatório para não invalidar OS existentes; associação de SLA/OLA específica por oferta, gestão de usuários e demais práticas ITIL continuam no backlog.

| Entrega | Sprints | Resultado observável |
| --- | --- | --- |
| Fundação | 0–3 | Acesso seguro e cadastros-base multiempresa |
| Operação web | 4–7 | Dispatcher controla uma OS do início ao fim administrativo |
| Campo/PWA | 8–10 | Técnico executa OS, inclusive em conectividade intermitente |
| Fechamento e gestão | 11–14 | Revisão, relatório, SLA, painéis e hardening |
| Integrações | 15–17 | Sincronização resiliente com Milldesk e, se aplicável, canais externos |
| Go-live | 18 | Piloto controlado e passagem para operação |

---

## Sprint 0 — Inception e governança técnica

**Objetivo:** tornar o desenvolvimento rastreável e preparar decisões que não devem surgir no meio da implementação.

- Confirmar papéis, matriz de permissões e responsáveis pelo aceite.
- Criar backlog priorizado com histórias, critérios de aceite e riscos.
- Definir convenções de branches, pull requests, versionamento e ADRs.
- Configurar ambientes dev, staging e produção no planejamento (sem segredos no repositório).
- Registrar política de privacidade, retenção de evidências, LGPD e acesso a GPS/fotos.
- Confirmar escopo contratual inicial de Cabling e catálogo de serviços.
- Definir estratégia de testes, observabilidade e correlação de requisições.

**Aceite:** arquitetura, matriz RBAC, processo de deploy e backlog inicial aprovados.

## Sprint 1 — Fundação do repositório e banco

**Objetivo:** consolidar a estrutura técnica e o modelo multiempresa inicial.

- Finalizar Next.js, TypeScript, Tailwind e design system base.
- Provisionar Supabase dev e aplicar migrations localmente.
- Criar tabelas: organizações, usuários, papéis, clientes, contratos, regiões, técnicos, localidades e contatos.
- Implementar RLS, funções de autorização e índices iniciais.
- Criar dados de desenvolvimento e procedimento seguro de bootstrap do primeiro administrador.
- Configurar lint, typecheck, testes unitários e CI inicial.
- Documentar configuração local e variáveis de ambiente.

**Aceite:** administrador de desenvolvimento consegue acessar exclusivamente dados de sua organização; nenhum acesso cruzado é permitido.

## Sprint 2 — Autenticação, RBAC e portal-base

**Objetivo:** disponibilizar acesso seguro e navegação de gestão.

- Integrar Supabase Auth e sessões server-side.
- Criar login, recuperação de senha, expiração de sessão e logout.
- Aplicar guards server-side por papel e organização.
- Criar layout web, navegação, estados de erro e tela de acesso negado.
- Implementar CRUDs administrativos de organizações, clientes, contratos e usuários.
- Registrar eventos administrativos em auditoria.
- Testar RLS, autenticação inválida e segregação de funções.

**Aceite:** os papéis de administrador, dispatcher, gerente, técnico e auditor enxergam somente funções autorizadas.

## Sprint 3 — Cadastros operacionais

**Objetivo:** preparar dados para atender uma OS sem depender de planilhas.

- CRUD de regiões, localidades e contatos.
- CRUD de técnicos, vínculo de usuário, região-base e disponibilidade.
- Cadastro de competências/certificações de técnicos.
- Catálogo inicial de serviços e categorias configuráveis.
- Importação assistida de localidades e validação de duplicidade.
- Busca, filtros e paginação server-side.
- Auditoria de alterações e testes de permissão.

**Aceite:** dispatcher consegue manter localidades, técnicos e serviços necessários ao primeiro contrato.

## Sprint 4 — Tickets e referências externas

**Objetivo:** introduzir a OS como domínio governado, ainda sem integração externa.

- Criar tabelas de tickets, referências Milldesk/ServiceNow, status e histórico.
- Criar numeração humana de OS (`FSM-AAAA-NNNNNN`).
- Implementar criação manual, visualização, pesquisa e filtros de tickets.
- Criar estado inicial, prioridade derivada de impacto/urgência e triagem.
- Preservar IDs externos sem assumir contratos de API.
- Criar domain service de transição e validações server-side.
- Registrar toda mudança de ticket no histórico e na auditoria.

**Aceite:** um chamado manual percorre `NEW → TRIAGE → AWAITING_SCHEDULING` com histórico imutável.

## Sprint 5 — Despacho e agenda

**Objetivo:** permitir planejamento e atribuição operacional.

- Criar atribuição de técnico, agenda e histórico de reagendamento.
- Validar competência, disponibilidade, região e conflito de agenda.
- Criar visão de lista, agenda diária e calendário para dispatcher.
- Implementar estados `SCHEDULED` e `ASSIGNED`.
- Adicionar controle otimista para alterações concorrentes.
- Criar notificações internas simples de nova atribuição.
- Testar conflitos de agenda, alteração concorrente e autorização.

**Aceite:** dispatcher agenda e atribui uma OS elegível; tentativas incompatíveis retornam conflito explícito.

## Sprint 6 — Execução controlada no portal

**Objetivo:** validar regras de campo antes do PWA completo.

- Implementar transições `TRAVEL_STARTED`, `ON_SITE`, `WORK_STARTED`, `IN_PROGRESS`.
- Registrar eventos de check-in, data/hora, precisão e justificativa de GPS divergente.
- Criar diagnóstico, domínio de falha e fluxo `OUT_OF_SCOPE`.
- Criar checklists configuráveis por serviço.
- Implementar regras de completude para conclusão técnica.
- Testar transições inválidas e manipulação de dados entre organizações.

**Aceite:** um técnico autorizado consegue executar uma OS pelo portal, sem pular pré-requisitos.

## Sprint 7 — Materiais, evidências e conclusão técnica

**Objetivo:** reunir provas e fatos operacionais para revisão.

- Modelar materiais, consumo por OS e catálogo mínimo.
- Criar bucket privado, políticas de storage, upload validado e URLs assinadas.
- Implementar evidências `ARRIVAL`, `BEFORE`, `DURING`, `AFTER` e `TEST_RESULT`.
- Validar MIME, tamanho, metadados e vínculo da evidência à OS.
- Implementar diagnóstico, solução, resultado e `TECHNICALLY_COMPLETED`.
- Registrar exceções e pendências padronizadas.
- Testar que arquivos não são públicos e que evidências incompletas bloqueiam a conclusão quando exigidas.

**Aceite:** uma conclusão técnica contém checklist, materiais, evidências e trilha de auditoria exigidos pelo serviço.

## Sprint 8 — PWA e agenda do técnico

**Objetivo:** entregar a experiência móvel essencial.

- Tornar o app instalável (manifest, ícones e service worker).
- Criar login mobile, agenda do dia e detalhe de OS responsivos.
- Criar ações de deslocamento, chegada, início, checklist e conclusão com foco em toque.
- Sincronizar dados mínimos: agenda, OS, contatos, checklist e catálogo de materiais.
- Criar indicadores de conectividade e sincronização.
- Validar acessibilidade, tamanhos de toque e navegadores móveis-alvo.

**Aceite:** técnico instala o PWA e executa a agenda diária online em dispositivo móvel.

## Sprint 9 — Offline-first e conflitos

**Objetivo:** preservar o trabalho de campo quando a rede falha.

- Implementar IndexedDB e fila `offline_actions`.
- Enfileirar eventos, observações, materiais e evidências pendentes.
- Definir idempotency keys e retry com backoff.
- Implementar sincronização posterior e visualização de falhas.
- Aplicar política de conflitos: eventos append-only, gestão vence em campos críticos e conflito explícito onde necessário.
- Testar queda de rede durante execução, reabertura e reenvio duplicado.

**Aceite:** eventos criados offline são sincronizados uma única vez e conflitos não são sobrescritos silenciosamente.

## Sprint 10 — Pendências e exceções operacionais

**Objetivo:** tratar cenários reais sem perder governança.

- Implementar pendências: cliente, acesso, material, terceiro, TI do cliente e autorização.
- Criar motivos padronizados, justificativa e responsáveis.
- Implementar reagendamento e retorno à execução.
- Aplicar lógica de escopo e encaminhamento configurável.
- Criar histórico de exceções e notificações de pendência.
- Testar estados alternativos, retorno e autorização de exceções.

**Aceite:** uma OS pendente registra motivo, tempo, responsável e retorno controlado ao fluxo.

## Sprint 11 — Revisão gerencial e encerramento

**Objetivo:** separar conclusão do técnico de aprovação administrativa.

- Criar fila de `MANAGER_REVIEW`.
- Implementar aprovação, devolução ao técnico e motivo obrigatório.
- Criar `APPROVED`, `REPORT_GENERATED` e `CLOSED` com pré-requisitos.
- Versionar revisões e garantir que aprovação tenha autor e timestamp.
- Criar telas de validação e comparação de evidências.
- Testar segregação: técnico não aprova a própria OS.

**Aceite:** gerente aprova ou devolve uma OS; apenas OS aprovadas podem ser encerradas.

## Sprint 12 — Relatórios e comunicação

**Objetivo:** produzir a evidência formal do atendimento, sem depender de integração externa.

- Definir template de relatório de serviço e campos contratuais.
- Gerar PDF server-side e versionar artefatos.
- Criar provider de e-mail encapsulado com ambiente seguro de testes.
- Implementar envio manual controlado, destinatários configuráveis e histórico.
- Implementar retry para geração e envio.
- Testar PDF, permissões de download e prevenção de e-mail real em staging.

**Aceite:** OS aprovada gera PDF versionado e pode ser enviada por e-mail com rastreabilidade.

## Sprint 13 — SLA, OLA e dashboards básicos

**Objetivo:** tornar desempenho e riscos operacionais visíveis.

- Criar políticas de SLA configuráveis por contrato.
- Criar instâncias, eventos, pausa com motivo e cronômetros separados de SLA/OLA.
- Calcular vencimentos e alertas básicos.
- Criar dashboard de volume, backlog, SLA, pendências e produtividade.
- Criar filtros por organização, contrato, região e período.
- Testar pausa, retomada, violação e limites de acesso a indicadores.

**Aceite:** gestor identifica tickets próximos/fora de SLA e explica pausas com evidência.

## Sprint 14 — Hardening e qualidade de MVP

**Objetivo:** preparar o núcleo operacional para piloto.

- Revisar RLS, políticas de storage e proteção contra elevação de privilégio.
- Adicionar rate limiting, validação de payload e correlation ID em APIs.
- Configurar logging estruturado, monitoramento de erros e alertas.
- Criar E2E do fluxo sem integração: criação → despacho → PWA → evidência → revisão → PDF → encerramento.
- Executar testes de carga básicos nas listagens e buscas.
- Revisar acessibilidade e recuperação de erros.
- Executar threat modeling e checklist LGPD.

**Aceite:** fluxo crítico passa de ponta a ponta em staging, sem falhas críticas de segurança conhecidas.

---

## Integrações — somente após o núcleo operacional

## Sprint 15 — Gateway e adapter Milldesk

**Objetivo:** integrar de forma desacoplada, idempotente e observável.

- Validar documentação, autenticação, limites, webhooks e campos oficiais do Milldesk.
- Definir contrato do adapter e criar mock de contrato para testes.
- Criar outbox, jobs e idempotency keys.
- Implementar importação de chamados e atualização de status em ambiente de sandbox.
- Criar logs de integração, correlation ID e fila de falhas.
- Testar duplicidade, timeout, respostas parciais e reprocessamento.

**Aceite:** o adapter importa e atualiza dados de sandbox sem criar duplicidades ou perder correlação.

## Sprint 16 — Reconciliação e operação degradada

**Objetivo:** operar de forma segura quando sistemas externos falharem.

- Criar tela de reconciliação e resolução assistida de divergências.
- Criar retry configurável e dead-letter queue.
- Definir comportamento quando Milldesk, e-mail ou storage estiverem indisponíveis.
- Criar métricas de fila, falhas, latência e sucesso de sincronização.
- Elaborar runbook operacional para incidentes de integração.
- Executar testes de caos controlados e recuperação.

**Aceite:** falhas externas não bloqueiam a execução em campo e são recuperáveis/auditáveis.

## Sprint 17 — Integrações opcionais e homologação externa

**Objetivo:** concluir conectores somente confirmados contratualmente.

- Integrar ServiceNow apenas se houver API, escopo e autorização formal; caso contrário, preservar apenas referências existentes.
- Configurar e-mail corporativo/Resend definitivo, se aprovado.
- Implementar adapter de mapas/rotas, se contratado.
- Homologar com Milldesk e cliente usando massa de testes autorizada.
- Executar teste de aceitação de integração e plano de rollback.

**Aceite:** cada conector possui contrato documentado, monitoramento, owner e rollback testado.

## Sprint 18 — Piloto e go-live

**Objetivo:** colocar uma operação limitada em produção com controle.

- Migrar cadastros iniciais validados.
- Treinar dispatchers, gerentes e técnicos.
- Executar piloto com localidades, técnicos e volume definidos.
- Acompanhar métricas, incidentes, reconciliação e feedback diário.
- Corrigir bloqueadores e formalizar aceite de operação.
- Planejar expansão regional e backlog da fase 2.

**Aceite:** piloto atende os critérios operacionais, de segurança e de governança definidos na especificação.

## Backlog posterior ao MVP

- Roteirização e recomendação de técnico.
- Estoque e fornecedores/parceiros.
- Precificação, composição, custo e margem com versionamento.
- Portal do cliente, alertas push, recorrência e base de conhecimento.
- Analytics avançado, rentabilidade e previsão de atraso.
# Marco atual — dashboard operacional Field Service

- Visão Geral com filtro de competência.
- Indicadores de chamados, OS, SLA, satisfação e faturamento demonstrativo.
- Gráficos de atendimentos por polo, subcategoria e região.
- Ranking de materiais por quantidade consumida.
- Catálogos centrais de unidades LPU e regiões operacionais.
- Próxima evolução: substituir gradualmente os agregadores demonstrativos por consultas persistidas de chamados, polos, OS e medições.

