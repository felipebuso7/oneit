# OneIT — status de continuidade

Atualizado em 12/11/2026.

## Lote de estados compartilhados (12/11/2026)

- **Implementado:** `OneitEmptyState`, `OneitLoadingState` e `OneitErrorState` agora usam uma superfície visual comum, faixa semântica lateral, ícone contextual e entrada suave respeitando `prefers-reduced-motion`.
- **Arquivos:** `src/components/oneit-state.tsx`, `src/app/globals.css`.
- **Verificação:** `npx tsc --noEmit` sem diagnósticos; contratos de Design System, agenda e responsividade — 2 arquivos / 5 testes aprovados.
- **Publicação:** commit `5641075` enviado para `main` e confirmado em produção pelo endpoint `/api/version` como `environment: production`; `/api/ready` retornou `status: ready` e `deploymentMode: supabase`.
- **Regressão ampliada:** `npm test -- --run --no-file-parallelism` — 166 arquivos / 394 testes aprovados.

## Lote de badges de status (13/11/2026)

- **Implementado:** os cinco tons de `OneitStatusBadge` agora têm contorno semântico além do preenchimento, melhorando leitura e acessibilidade em tabelas e cards.
- **Arquivo:** `src/app/globals.css`.
- **Verificação:** TypeScript sem diagnósticos; contratos de Design System e navegação — 2 arquivos / 13 testes aprovados.
- **Publicação:** commit `75bd769` enviado para `main`; acompanhamento do deployment feito pelo endpoint público.

## Smoke de storage (13/11/2026)

- `/api/ready?storage=1` em produção retornou `status: ready`, `deploymentMode: supabase` e `storage: ready`.
- Isso confirma a disponibilidade do provedor, mas não substitui o upload autenticado de uma evidência sintética; esse passo segue pendente.
- `npm run audit:migrations -- --strict` foi reexecutado: 196 migrations, nenhum alerta estático.
- Lint de UI central e Field Service reexecutado (`lint:core-ui` e `lint:field-service`) sem diagnósticos; o processo encerrou após as duas etapas.
- Build local reexecutado após limpar somente `.next`: continua bloqueado por `EPERM` ao criar diretório em `.next/server/app/api/sgsti/master-plan/tasks`; não há diagnóstico de erro TypeScript ou de código, e o deployment remoto permanece a referência de produção.
- Tentativa isolada com `ONEIT_NEXT_DIST_DIR=.next-ci` também falhou com `EPERM` ao criar `.next-ci/server/app/api/field-service`, mesmo após remover o atributo `ReadOnly` da rota que havia sido identificada; o bloqueio é de filesystem local e não de compilação tipada.
- Tentativa de output em `%TEMP%` foi rejeitada pelo próprio Next (`InvalidDistDirError`), que exige `distDir` dentro do workspace. Não há alternativa de output externo suportada sem alterar a configuração de build.

## Verificação desta retomada

- **Fila de chamados — responsividade (12/11/2026):** a listagem agora troca a tabela horizontal por cartões operacionais abaixo de `lg`, mantendo chamado/ServiceNow, situação, cliente/local, técnico, visita e ação no mesmo viewport. Em desktop, a tabela permanece disponível para produtividade. Evidência: `src/components/tickets/tickets-table.tsx`; contrato `tests/portal-responsive-contract.test.ts`, `tests/tickets-queue-ui-contract.test.ts` — 3 arquivos / 6 testes aprovados; `npx tsc --noEmit` sem diagnósticos.
- **Regressão após a fila responsiva (12/11/2026):** suíte completa `npm test -- --run --no-file-parallelism` aprovada — 165 arquivos / 392 testes.
- **Smoke autenticado da fila (12/11/2026):** domínio oficial `oneit-omega.vercel.app/portal/tickets` carregou 6 registros; a leitura exibiu situação, chamado/ServiceNow, cliente/local, título/serviço, técnico, visita e ação contextual. Verificação somente leitura em viewport desktop; validação móvel autenticada permanece pendente.
- **RLS de dados filhos (12/11/2026):** identificada e corrigida em migration aditiva a leitura ampla baseada somente na existência do `ticket_id`. `20261113090000_harden_ticket_child_rls.sql` exige papel de gestão da organização ou técnico atribuído, inclusive para objetos privados de evidência e relatório. Testes direcionados: 3 arquivos / 6 testes aprovados; TypeScript sem diagnósticos. A migration ainda não foi aplicada no Supabase remoto.
- **Regressão após RLS (12/11/2026):** suíte completa `npm test -- --run --no-file-parallelism` aprovada — 166 arquivos / 394 testes.
- **Auditoria estática de migrations (12/11/2026):** `npm run audit:migrations -- --strict` encontrou 196 migrations e nenhum alerta.

- Regressão direcionada executada após a publicação `e202dd8`: 4 arquivos e 14 testes aprovados (`field-service-rto-render`, `measurement-pdf-visual`, `portal-navigation`, `auth-rbac-contract`). Nenhuma mutação foi feita em produção.
- Regressão ampliada dos contratos operacionais: 15 arquivos e 23 testes aprovados, cobrindo despacho/WhatsApp, execução, validação, RTO, LPU e BM. A evidência é estática/contratual; o E2E autenticado com mutação e upload real continua pendente.
- Suíte completa executada nesta retomada: 165 arquivos e 392 testes aprovados. O aviso do Vitest sobre `configLoader: native` permanece informativo e não alterou o resultado.
- Verificação TypeScript (`npx tsc --noEmit`) concluída sem diagnósticos.
- Verificação visual read-only no domínio oficial `https://oneit-omega.vercel.app/portal/field-service`: navegação autenticada renderizada com os rótulos operacionais atuais; a fila exibiu 0 chamados aguardando despacho, 2 visitas agendadas e os links para chamados/rotas. Nenhuma mutação foi executada.

## Último lote validado

- Redesign estrutural da Home autenticada publicado no preview Vercel do commit `1802818`; o deployment foi observado como **Ready**. A validação visual autenticada permanece limitada nesta execução porque a nova aba visível não pôde ser aberta.
- O componente compartilhado `OneitKpiGrid` foi refinado com estados visualmente distinguíveis para indicadores normais, atenção e positivos; testes de navegação/design system passaram.
- URL do preview da branch: `https://oneit-git-preview-home-redesign-okaa1.vercel.app/portal`. A Vercel publicou o artefato, mas o ambiente de Preview redireciona para `error=environment` por não possuir as variáveis de autenticação; a validação visual autenticada pós-redesign permanece bloqueada.
- Navegação lateral recebeu estados de foco visível, transições de 200 ms e deslocamento sutil no hover para links não ativos. Commit `2f6a79e` publicado na branch de preview; produção permanece intocada.
- Catálogo de serviços reestruturado na branch de preview `aff7890`: abas por nível, contagem de registros, tabela com código/status/edição/exclusão e formulário contextual separado para categoria ou subcategoria. TypeScript aprovado.
- Regressão direcionada do catálogo e navegação executada: 1 arquivo e 10 testes aprovados. O aviso do Vitest sobre encerramento do processo permanece não bloqueante; os testes fecham com sucesso.
- Fila de Chamados recebeu ajuste global de tabela: layout fixo, cabeçalho sticky, quebra segura de conteúdo e largura reduzida em viewport estreito. Commit `538a16b` publicado no preview; validação autenticada visual segue bloqueada pelo ambiente Preview.
- Revisão da Agenda Técnicos: a tela consolida `ticket_schedules` e `service_orders`, colore compromissos por técnico e permite abrir o chamado. A regressão correta (`routes-agenda-ui-contract`, `portal-scheduling-technician-source` e `portal-navigation`) passou com 14 testes; a busca anterior por um nome de arquivo inexistente foi corrigida.
- Dashboard operacional validado com os contratos de paleta, cabeçalho e navegação: 3 arquivos, 16 testes aprovados. Os cartões KPI usam o refinamento visual compartilhado do `OneitKpiGrid`, sem alterar as métricas reais.
- PDFs operacionais validados por contrato: RTO/BM e branding passaram em 2 arquivos e 2 testes. A validação visual renderizada de páginas A4 ainda depende de dados autenticados disponíveis no ambiente de homologação.

- Padronização de nomenclatura do despacho: **Agendamento de OS**.
- Padronização da agenda do técnico: **Agenda Técnicos**.
- Horários do técnico formatados no fuso `America/Sao_Paulo`.
- Lista de RTOs alinhada ao rótulo operacional **RTO Encerrados**.
- Teste de contrato do despacho aprovado e TypeScript aprovado.
- Regressão automatizada P1 executada: 11 arquivos e 20 testes aprovados cobrindo despacho, revisão, RTO, fotos, LPU e download.
- Regressão adicional de evidências/storage: 5 arquivos e 9 testes aprovados, incluindo fotos, erros de RTO, fluxo do parceiro e integridade de banco.
- Regressão completa executada em lotes (para evitar timeout do processo único): 164 arquivos e 390 testes aprovados.
- Build de produção local iniciado, mas bloqueado por `EPERM` ao limpar `.next/server/app/portal/field-service`; não é falha de compilação confirmada.
- Verificação dinâmica sem mutação no domínio oficial: `/portal/tickets` exibiu 6 registros persistidos e filtros operacionais; `/portal/field-service` exibiu a fila e 2 visitas agendadas; `/portal/review` exibiu a fila gerencial e RTOs disponíveis.
- Revisão de LPU concluída: 5 arquivos e 14 testes aprovados cobrindo CRUD, unidades, preço, vigência, composição e aplicação na OS; nenhuma divergência de tipo foi confirmada.
- Isolamento portal/demo protegido por teste estrutural: 2 testes aprovados, sem `localStorage`, `sessionStorage` ou chaves `oneit.demo` nas rotas autenticadas; a demonstração permanece restrita às rotas `/demo` e `/api/demo`.
- Contrato responsivo do portal aprovado: 2 testes garantem rolagem horizontal controlada da fila, cabeçalho empilhável e liberação do conteúdo em viewport estreito; captura visual móvel real ainda pendente.
- Contrato do Design System aprovado: 2 testes confirmam tokens centrais e uso dos componentes compartilhados de botão, cabeçalho, tabela, estado e badge.

## Estado conhecido

- O worktree possui alterações anteriores do projeto; não fazer limpeza destrutiva.
- O preview atual da branch `preview/home-redesign` está disponível em `https://oneit-2au3hl90o-okaa1.vercel.app/` e corresponde ao commit `1802818`.
- Regressão direcionada das jornadas críticas executada em 14 arquivos e 24 testes: chamados, despacho, execução, validação, RTO e BM passaram.
- Os commits `d9674ab`, `3cde5f6` e `fdfed79` foram publicados no GitHub nas branches `prep/cloud-staging` e `main`.
- O GitHub foi conectado ao projeto Vercel (`felipebuso7/oneit`). O deployment de preview do commit `fdfed79` ficou **Ready** em `oneit-btgduul66-okaa1.vercel.app`, mas o ambiente de preview não possui as variáveis de autenticação e redireciona para `error=environment`.
- O push para `main` disparou os deployments de produção `oneit-rf8jbd9p6-okaa1.vercel.app` e `oneit-lzcwvchao-okaa1.vercel.app`; ambos ficaram **Ready**. O domínio oficial `https://oneit-omega.vercel.app` foi recarregado e exibiu “Abrir Agendamento de OS”, “Agendamento de OS”, “Agenda Técnicos” e “RTO Encerrados”.
- Validações dinâmicas dependem de sessão autenticada e não substituem E2E completo.
- A validação dinâmica confirmou o portal autenticado e não acessou nenhuma rota `/demo`.

## Próxima ação

- Regressão ampla após os lotes de Home, fila e catálogo: 4 arquivos e 15 testes aprovados; os contratos legados foram preservados sem alterar as regras operacionais.
- Ajustes de compatibilidade aplicados: ação “Abrir Agendamento de OS” na Home, identificadores de busca/filtro da fila, largura mínima responsiva e marcadores de escopo/retirada segura no catálogo.
- Jornada do técnico refinada em `src/components/field-service/partner-execution-flow.tsx`: cada estado agora destaca explicitamente a **Próxima ação** em uma faixa de alto contraste, mantendo a linha do tempo, regras de evidência, materiais, assinatura e checkout. Testes direcionados: 5 arquivos e 9 testes aprovados.
- Navegação global refinada em `src/components/portal-sidebar-light.tsx`: grupos com rota ativa agora recebem marcador visual laranja e contraste textual reforçado, mantendo foco por teclado e seleção de página. Testes de navegação/responsividade: 2 arquivos e 12 testes aprovados.
- Fila de chamados refinada em `src/app/globals.css`: coluna de ação ganhou largura mínima, alvos de toque consistentes e feedback contextual distinto para abrir/agendar/excluir, mantendo a tabela navegável em viewport estreito. Testes de fila/responsividade/navegação: 3 arquivos e 15 testes aprovados.
- Ação primária do despacho refinada em `src/app/(portal)/portal/field-service/dispatch-workspace.tsx`: “Agendar visita e encaminhar por WhatsApp” agora usa destaque laranja, alvo de toque maior, hover e estado desabilitado explícito. Testes de despacho/WhatsApp/concorrência: 4 arquivos e 6 testes aprovados.
- Decisão gerencial refinada em `src/app/globals.css`: aprovar OS usa estado verde semântico e devolver para correção usa estado âmbar, mantendo foco na conferência e sem alterar as ações do backend. Testes de revisão: 5 arquivos e 9 testes aprovados.
- Agenda Técnicos refinada em `src/app/(portal)/portal/scheduling/page.tsx`: legenda visual por técnico adicionada acima dos compromissos, preservando as cores usadas nos eventos e a navegação para o chamado. Testes de agenda/navegação: 3 arquivos e 14 testes aprovados.
- Abertura de chamado refinada em `src/components/tickets/ticket-create-flow.tsx`: o drawer agora exibe progresso visual explícito entre referência/serviço e dados da solicitação, mantendo bloqueios e validações existentes. Testes de criação/fila/navegação: 2 arquivos e 13 testes aprovados.
- BM refinado em `src/app/(portal)/portal/field-service/finance/measurement-panel.tsx` e `src/app/globals.css`: ação de iniciar fechamento ganhou destaque, totais ficaram mais evidentes e ações de PDF/validação receberam alvos e hover consistentes. Testes de PDF/BM: 2 arquivos e 2 testes aprovados.
- Tela de login refinada em `src/app/(auth)/login/page.tsx`: fundo com identidade OneIT, superfície translúcida com profundidade e destaque visual mais forte para a entrada, sem alterar autenticação, mensagens ou permissões. Testes de auth/navegação: 2 arquivos e 11 testes aprovados.
- Catálogo administrativo refinado em `src/app/globals.css`: abas de categorias/subcategorias ganharam transição, hover e contraste de navegação mais claros, preservando CRUD e escopo organizacional. Testes do catálogo/navegação: 2 arquivos e 19 testes aprovados.
- Microinteração aplicada ao fluxo de abertura: drawers de catálogo/preenchimento entram em 180 ms com respeito a `prefers-reduced-motion`, sem mascarar erros nem alterar o comportamento do formulário. Testes de fila/navegação/responsividade: 3 arquivos e 15 testes aprovados.
- Design System refinado em `src/app/globals.css`: botões compartilhados agora possuem foco visível consistente e cards/cabeçalhos evidenciam o contexto quando recebem foco interno, melhorando teclado e acessibilidade sem mudar layout estrutural. Testes do Design System: 1 arquivo e 10 testes aprovados.
- Login refinado com foco automático no campo de e-mail, reduzindo um toque na entrada e mantendo a ordem de teclado e o contrato de autenticação. Teste RBAC: 1 aprovado.
- PDFs para cliente validados com dados sintéticos: BM renderizado em 2 páginas A4 com logos OneIT/Servicia, resumo identificado (item, quantidade e total), detalhamento da OS, valor geral e paginação; RTO renderizado em 2 páginas A4 com seções, cronologia, evidências em grade uniforme, LPU/materiais, aceite e assinaturas no fechamento. Ajuste de espaçamento aplicado no resumo do BM para evitar colisão entre cabeçalho e primeira linha.
- Pós-publicação: regressão direcionada de Field Service, RTO e BM aprovada em 35 arquivos e 63 testes, sem falhas funcionais detectadas.
- Produção confirmada no Vercel pelo commit `a6f2571` com status Ready. A implantação abriu corretamente a tela de login no host dedicado; a sessão autenticada permanece no domínio oficial. A última verificação de storage conhecida respondeu `200` com `deploymentMode: supabase` e `storage: ready` no commit anterior.
- Lote de segurança e isolamento revalidado: 5 arquivos e 11 testes aprovados para RBAC, isolamento `/demo`, elegibilidade de técnicos e integridade de relacionamentos entre organizações.
- Suíte completa após a publicação: 165 arquivos e 392 testes aprovados, sem falhas automatizadas detectadas.
- Verificação dinâmica read-only em produção (12/11/2026): `/portal/review` carregou autenticado, exibindo 0 OS aguardando validação, 2 OS aprovadas; uma com RTO pendente e outra com RTO versão 3 registrada e ação de encerramento disponível. Essa evidência confirma leitura/renderização do fluxo, mas não substitui a mutação autenticada do E2E.
- Regressão direcionada pós-checkpoint: 4 arquivos e 14 testes aprovados (`field-service-rto-render`, `measurement-pdf-visual`, `portal-navigation`, `auth-rbac-contract`).

Próxima ação: executar E2E autenticado do ciclo chamado → agendamento → técnico → validação → RTO/BM em homologação, registrando cada etapa como aprovado, reprovado ou bloqueado. A fila autenticada foi verificada em produção no domínio oficial; o último código publicado confirmado como Ready antes deste lote foi `71c1305`, e o deployment do lote responsivo foi disparado após `9452d14`/`5c44734`. Não declarar o ciclo completo até validar mutações autenticadas e upload real.
### Publicação e agenda (12/11/2026)

- **Produção confirmada:** commit `c997a6d` (`docs: record migration audit`) aparece como **Ready** na Vercel, com deployment `oneit-4etrzufu1-okaa1.vercel.app`; o domínio oficial continua `https://oneit-omega.vercel.app`.
- **Agenda/despacho:** contratos direcionados aprovados (`15/15` testes) e TypeScript sem erros. A tela usa `technicians` como fonte canônica, mantém o filtro por organização e apresenta agenda por data, técnico e cor.
- **Smoke autenticado da agenda:** em `https://oneit-omega.vercel.app/portal/scheduling`, a data atual exibiu estado vazio honesto e link para a última data com agenda; em `?date=2026-10-29`, foi exibido compromisso real `13:00–14:00` vinculado ao chamado `FSM-2026-000004` e ao técnico `Eder Ponciano`, com link para abrir o chamado. Nenhuma mutação foi executada.
- **Limitação ainda aberta:** a migration `20261113090000_harden_ticket_child_rls.sql` segue preparada no repositório, mas ainda não aplicada remotamente no Supabase; o ciclo E2E autenticado com upload/RTO permanece pendente de homologação.
- **Regressão completa após o checkpoint:** `npm test -- --run --no-file-parallelism` passou com `166` arquivos e `394` testes.
- **Melhoria implementada:** a agenda agora agrupa os compromissos em blocos por técnico, com contagem de visitas, cor consistente e cards responsivos; cada card mantém o link direto para o chamado. Commit `fe6f6de`; typecheck e 14 contratos direcionados aprovados.
- **Validação visual pós-deploy:** em produção, `?date=2026-10-29` exibiu o bloco `Agenda de Eder Ponciano`, `1 visita` e o compromisso `13:00–14:00` com link para o chamado. Nenhuma mutação foi executada.
- **Rotas planejadas — smoke autenticado:** em produção, `portal/routes?date=2026-10-29` exibiu `Eder Ponciano` com blocos **Manhã** (`08:00–12:00`) e **Tarde** (`13:00–18:00`), cada um com OS, polo/local e horário; **Noite** foi exibida como “Sem visita”. Nenhuma mutação foi executada.

### Fila de chamados — seleção e ações administrativas (13/11/2026)

- **Implementado:** `src/components/tickets/tickets-table.tsx` passou a permitir selecionar um chamado por rádio, em desktop e mobile, com barra contextual de ações.
- **Ações:** “Editar chamado” leva ao dossiê do chamado para atualização contextual; “Excluir chamado” usa a ação server-side existente `cancelTicket`, confirmação explícita, controle de versão e bloqueio para chamados já iniciados/encerrados.

### Regra de exclusão — validação do chamado FSM-2026-000006

O chamado exibido na validação visual está em **Aguardando validação** (`TECHNICALLY_COMPLETED` / `AWAITING_REVIEW`) e possui execução de campo registrada. O botão “Excluir chamado” permanecer desabilitado nesse estado é comportamento intencional: a função `public.cancel_ticket` (migration `20261028200000_cancel_ticket.sql`) rejeita chamados com deslocamento, atendimento iniciado ou conclusão técnica, preservando o histórico operacional e o vínculo do RTO.

Não foi aplicado bypass no frontend nem no Supabase. Chamados ainda não atendidos continuam elegíveis para cancelamento pela fila, com confirmação e auditoria. Para remover registros de homologação que já tiveram execução, é necessária uma operação administrativa de limpeza de dados de teste, com critério explícito e autorização separada; excluir esses registros pela fila quebraria a trilha operacional.

### Retomada da auditoria — RLS de dados filhos

- `npm run audit:migrations -- --strict`: **196 migrations, nenhum alerta estático**.
- A migration `20261113090000_harden_ticket_child_rls.sql` permanece pronta, mas a tentativa de `supabase db push --dry-run` foi bloqueada pelo `EPERM` do CLI ao gravar `C:\Users\felipe.buso_tothetop\\.supabase\\telemetry.json.tmp...`; nenhuma alteração remota foi executada.
- Próxima ação: aplicar a migration em ambiente Supabase autenticado após liberar o armazenamento do CLI ou usar o SQL Editor conectado, e então validar leitura isolada entre organizações.

### Smoke autenticado da fila — produção (13/11/2026)

- Domínio `https://oneit-omega.vercel.app/portal/tickets` carregou 6 chamados persistidos.
- O registro selecionado `FSM-2026-000006` exibiu o botão desabilitado com a ajuda acessível: “Este chamado já iniciou o atendimento e não pode ser excluído”.
- O mesmo registro mostrou situação **Aguardando validação**, técnico **Eder Ponciano**, visita `30/10/2026, 13:00` e ação **Validar OS**, confirmando que a regra visual corresponde ao estado operacional.
- Nenhuma mutação foi executada durante o smoke.

### Regressão visual/operacional direcionada (13/11/2026)

- Contratos de navegação, responsividade da fila e estados visuais: **3 arquivos / 15 testes aprovados**.
- A suíte completa foi iniciada duas vezes, mas não emitiu resultado dentro do limite local de 30 s; portanto não é considerada aprovada neste checkpoint.
- Nenhuma alteração de código ou dado foi necessária neste lote.

### Correção da exclusão operacional (13/11/2026)

- **Causa confirmada:** `cancel_ticket` marcava o chamado como `CANCELLED`, mas a consulta da fila carregava todos os estados; por isso o chamado parecia não ter sido removido.
- **Correção:** a fila operacional agora exclui `CANCELLED` na consulta, mantendo o histórico no banco e a auditoria do cancelamento.
- **Verificação:** 4 arquivos / 10 testes direcionados aprovados; o aviso de encerramento do Vitest não alterou o resultado.
- **Commit:** `8b2c44c`.

### Publicação e validação da correção (13/11/2026)

- Commit publicado em `main`: `a6a6e537594ccf10b2eda78ae7152d23e4016153`.
- `/api/version` confirmou produção em estado `Ready`, deployment `oneit-ace46e6bc0-20261113131254`.
- Smoke autenticado na fila: a listagem caiu de `6 de 6` para `2 de 2`; os chamados cancelados deixaram de ser exibidos na fila operacional.
- Os registros não foram apagados fisicamente: continuam preservados no banco com status `CANCELLED` e auditoria.

### Smoke visual da Home — produção (13/11/2026)

- `/portal` autenticado renderizou hero operacional, ação primária “Abrir fila de chamados”, três jornadas (“Chamados”, “Agendamento de OS”, “Validação de OS”), fluxo em cinco etapas e acessos rápidos para Agenda, BM e Catálogo.
- A navegação global exibiu os destinos operacionais atuais, sem links órfãos observados nesta leitura.
- Evidência dinâmica obtida por snapshot DOM autenticado; nenhuma mutação executada.

### Readiness de produção — storage (13/11/2026)

- `GET /api/ready?storage=1` retornou `status: ready`, `deploymentMode: supabase` e `storage: ready`.
- Isso confirma a disponibilidade da infraestrutura de storage, mas não substitui upload autenticado de evidência sintética.

### Regressão pós-correção da fila (13/11/2026)

- `git diff --check`: limpo.
- Auditoria estrita: **196 migrations, nenhum alerta**.
- Contratos de fila, ServiceNow e ações administrativas: **3 arquivos / 8 testes aprovados**.
- O aviso de encerramento tardio do Vitest permanece não bloqueante; os testes fecharam com sucesso.

### Regressão dos fluxos críticos (13/11/2026)

- Despacho, execução/fechamento, RTO/BM, autenticação/RBAC e isolamento RLS: **5 arquivos / 7 testes aprovados**.
- A execução foi contratual/estática; nenhum chamado, upload ou documento foi mutado em produção.

### Verificação técnica pós-lote (13/11/2026)

- `npx tsc --noEmit --pretty false`: concluído sem diagnósticos.
- O lint central e o lint direcionado não emitiram diagnósticos antes do limite de execução local; não foram classificados como aprovação independente.

### Isolamento portal/demo (13/11/2026)

- Contratos de isolamento e ausência de persistência local nas rotas autenticadas: **2 arquivos / 4 testes aprovados**.
- A superfície `/demo` permanece separada das rotas autenticadas; nenhuma alteração de dados foi executada.

### RLS remota — verificação read-only (13/11/2026)

- SQL Editor autenticado no projeto `oneit-staging`/branch `main` retornou as políticas `read visible ticket evidences`, `read visible ticket execution` e `read visible ticket reports`.
- Isso confirma que a migration de endurecimento está aplicada remotamente; não foi executado SQL de alteração nesta verificação.
- Permanece pendente somente o teste negativo com dois usuários/organizações distintas.

### Smoke visual da Agenda Técnicos — produção (13/11/2026)

- A tela renderizou título, seletor de data, atualização, legenda de técnicos e as filas de compromissos/agendamento/atribuição.
- Para `13/11/2026`, o estado vazio foi honesto e exibiu link para a última data com agenda; não foram apresentados dados fictícios.
- Nenhuma mutação foi executada.

### Agenda com dados reais — produção (13/11/2026)

- Consulta autenticada em `?date=2026-10-29` exibiu o bloco **Agenda de Eder Ponciano**, `1 visita` e o compromisso `13:00–14:00` com link direto para o chamado `FSM-2026-000004`.
- A composição por técnico e o estado vazio das filas de pendência/atribuição foram renderizados sem dados fictícios.

### Smoke RTO Encerrados — produção (13/11/2026)

- A tela autenticada renderizou filtros por período, chamado e técnico, ação de limpar filtros e **3 relatórios disponíveis**.
- Cada relatório exibiu OS, chamado, técnico, versão, data, SHA-256 e link de download PDF.
- Nenhuma geração, exclusão ou alteração de relatório foi executada.

### Smoke Boletim de Medição — produção (13/11/2026)

- A tela autenticada renderizou organização, competência, ação **Iniciar fechamento**, fluxo em quatro etapas e histórico real.
- Foi exibido o BM `BM-2026-10`, competência `10/2026`, 1 OS, valor `R$ 750,00`, status `Rascunho`, ação de validação e link de prévia PDF.
- Nenhum fechamento, validação ou envio foi executado.

### Smoke Catálogo de Serviços — produção (13/11/2026)

- A tela renderizou abas de categorias/subcategorias, contagens, edição inline, ações de salvar/excluir e formulário de nova categoria.
- Foram exibidas 2 categorias ativas (`Cabling` e `Cabeamento Homologação`); a tela manteve o escopo organizacional e não executou mutações.
- **Segurança preservada:** a exclusão continua sendo cancelamento auditável via RPC `cancel_ticket`; não há remoção física nem bypass de RLS.
- **Verificação:** contratos responsivos e de despacho passaram (`3/3` testes). `tsc` foi iniciado, mas excedeu o limite de execução local sem emitir diagnóstico; deve ser repetido no CI/ambiente de build.
- **Publicação:** commit `9b0a580` foi enviado com sucesso para `origin/main`. O endpoint público `/api/version` ainda responde o commit `eae0f44`; o webhook/deploy da Vercel ainda não propagou esta alteração. Não declarar a funcionalidade disponível em produção até o endpoint refletir `9b0a580`.

### Smoke Cadastro de LPU — produção (13/11/2026)

- A rota autenticada `/portal/settings/field-service/lpu` renderizou o cadastro de item com organização, código, descrição, tipo (Material/Mão de obra/Deslocamento), unidade, valor unitário e vigência.
- A listagem exibiu 2 itens ativos reais (`MT-001` Cabo de Rede CAT 6 e `VIS-001` Visita Técnica - 3 Horas), com filtros por tipo e ações de **Editar** e **Desativar**.
- A seção **Composições de LPU** renderizou seleção de item vigente, quantidade e ação de adicionar/salvar; o estado vazio foi honesto (`0 cadastrada(s)`).
- Nenhuma criação, edição, desativação ou composição foi executada nesta validação para preservar dados reais. O CRUD completo continua pendente de teste controlado em homologação.

### Revalidação de exclusão/cancelamento de chamados — produção (13/11/2026)

- `/api/version` respondeu `5e49da3b2683f929dcdca49bc611222812378706` em `environment=production`.
- A fila respondeu **2 de 2** e não exibiu chamados com `operational_status = CANCELLED`; portanto o cancelamento seguro continua removendo o chamado da fila ativa.
- Os dois registros visíveis estavam em **Aguardando validação** (`TECHNICALLY_COMPLETED`). O seletor funciona, mas o botão de exclusão permanece desabilitado por regra explícita: após check-in/execução, o histórico, evidências, assinatura, RTO e BM devem ser preservados.
- Teste direcionado: `portal-ticket-queue-limits.test.ts` + `tickets-queue-ui-contract.test.ts` — **2 arquivos / 6 testes aprovados**.
- Conclusão: não há falha de seleção ou de publicação. O comportamento observado é uma restrição de integridade, não uma exclusão quebrada. A remoção de dados de teste já executados exige rotina administrativa controlada/homologação, não exclusão física pela fila de produção.

### Lote visual — Matriz de prioridade (13/11/2026)

- Rota ajustada: `/portal/priority-matrix`.
- Alterações visíveis: cabeçalho `OneitPageHeader`, formulário em cartão, labels acessíveis, campos com estados consistentes, mensagem semântica e tabela em superfície compartilhada `oneit-card`.
- Verificação: `npx tsc --noEmit --pretty false` sem diagnósticos; `operational-page-header-contract.test.ts` — **1/1 teste aprovado**.
- Publicação: commit `eff94b2` sincronizado em `origin/main`; a propagação da Vercel deve ser confirmada pelo `/api/version` antes de declarar a rota em produção.

### Lote visual — Calendários operacionais (13/11/2026)

- Rota ajustada: `/portal/calendars`.
- Alterações visíveis: cabeçalho compartilhado, formulário “Novo calendário” em cartão, labels acessíveis, feedback de operação e estado vazio consistente.
- Verificação: `npx tsc --noEmit --pretty false` e `operational-page-header-contract.test.ts` executados sem diagnóstico visível neste ambiente.
- Publicação: pendente sincronização do commit deste lote e confirmação via `/api/version`.

### Lote visual — SLA e OLA (13/11/2026)

- Rota ajustada: `/portal/sla`.
- Alterações visíveis: cabeçalho compartilhado, formulário “Nova política” em cartão, labels acessíveis, feedback semântico e estado vazio consistente.
- Verificação: `operational-page-header-contract.test.ts` — **1/1 aprovado**; `tsc` executado sem diagnóstico reportado.
- Publicação: pendente sincronização do commit deste lote e confirmação via `/api/version`.

### Lote visual — Grupos de suporte (13/11/2026)

- Rota ajustada: `/portal/support-groups`.
- Alterações visíveis: cabeçalho compartilhado, formulário “Novo grupo” em cartão, labels acessíveis, feedback semântico e tabela/estado vazio consistente.
- Verificação: `operational-page-header-contract.test.ts` — **1/1 aprovado**; typecheck executado sem diagnóstico reportado.
- Publicação: pendente sincronização do commit deste lote e confirmação via `/api/version`.

### Lote visual — Escalonamentos (13/11/2026)

- Rota ajustada: `/portal/escalations`.
- Alterações visíveis: cabeçalho compartilhado, formulário “Novo escalonamento” em cartão, labels acessíveis, feedback semântico e histórico padronizado.
- Verificação: `operational-page-header-contract.test.ts` — **1/1 aprovado**; typecheck não reportou diagnóstico.
- Publicação: pendente sincronização do commit deste lote e confirmação via `/api/version`.

### Lote visual — Feature flags (13/11/2026)

- Rota ajustada: `/portal/feature-flags`.
- Alterações visíveis: cabeçalho compartilhado, formulário “Nova configuração” em cartão, labels acessíveis, feedback semântico e tabela/estado vazio consistentes.
- Verificação: `operational-page-header-contract.test.ts` — **1/1 aprovado**.
- Publicação: pendente sincronização do commit deste lote e confirmação via `/api/version`.

### Lote visual — Configurações SaaS (13/11/2026)

- Rota ajustada: `/portal/saas-settings`.
- Alterações visíveis: cabeçalho compartilhado, cartões individuais por organização, labels acessíveis, feedback semântico e estado sem organizações consistente.
- Verificação: `operational-page-header-contract.test.ts` — **1/1 aprovado**.
- Publicação: pendente sincronização do commit deste lote e confirmação via `/api/version`.

### Lote visual — Pendências e reagendamento (13/11/2026)

- Rota ajustada: `/portal/pending`.
- Alterações visíveis: cabeçalho compartilhado, cartões de pendência, bloco de reagendamento em disclosure, labels acessíveis, estados de erro/sucesso e histórico operacional padronizados.
- Verificação: `operational-page-header-contract.test.ts` — **1/1 aprovado**.
- Publicação: pendente sincronização do commit deste lote e confirmação via `/api/version`.

### Lote visual — Relatórios operacionais (13/11/2026)

- Rota ajustada: `/portal/operational-reports`.
- Alterações visíveis: cabeçalho compartilhado, filtros de período com estado selecionado, cards KPI em `oneit-card` e aviso metodológico preservado.
- Verificação: `operational-page-header-contract.test.ts` — **1/1 aprovado**.
- Publicação: pendente sincronização do commit deste lote e confirmação via `/api/version`.

### Verificação de propagação — produção (13/11/2026)

- O endpoint público `/api/version` foi consultado no navegador autenticado.
- Produção respondeu o commit `b9771ce9acf4363e59596876aa32bba6724d2851`, deployment `oneit-65243ec545-20261113135859`.
- Os commits posteriores (`59ead9c` e seguintes) estão sincronizados no Git, mas ainda não estavam refletidos pela Vercel no momento da verificação; não declarar esses lotes como disponíveis em produção até nova confirmação.
- Revalidação posterior manteve o mesmo resultado: produção continua em `b9771ce`.
- Nova verificação no navegador mostrou deployment `oneit-e5c9f0c8bd-20261113140203` com commit efetivo `c4dcd9e`; os commits posteriores ainda aguardam propagação.
- Nova verificação mostrou deployment `oneit-4a2ed7482a-20261113140609` com commit efetivo `d3cfe01`; `f1952ab` e posteriores ainda aguardam propagação.
- Nova verificação mostrou deployment `oneit-718a0b0604-20261113140748` com commit efetivo `f1952ab`; `0f5fde8` e posteriores ainda aguardam propagação.

### Lote visual — Avisos operacionais (13/11/2026)

- Rota ajustada: `/portal/announcements`.
- Alterações visíveis: cabeçalho compartilhado, formulário de publicação em cartão, labels acessíveis, feedback semântico e cartões de avisos com confirmação de leitura preservada.
- Verificação: `operational-page-header-contract.test.ts` — **1/1 aprovado**.
- Publicação: pendente sincronização do commit deste lote e confirmação via `/api/version`.

### Lote visual — Trilha de auditoria (13/11/2026)

- Rota ajustada: `/portal/audit`.
- Alterações visíveis: cabeçalho compartilhado, tabela de eventos em `oneit-card` e estado vazio consistente, mantendo fingerprint e leitura somente.
- Verificação: `operational-page-header-contract.test.ts` — **1/1 aprovado**.
- Publicação: pendente sincronização do commit deste lote e confirmação via `/api/version`.

### Lote visual — Painel de governança (13/11/2026)

- Rota ajustada: `/portal/governance-dashboard`.
- Alterações visíveis: cabeçalho compartilhado, cards KPI em `oneit-card`, links contextuais e microinteração discreta; métricas reais preservadas.
- Verificação: `operational-page-header-contract.test.ts` — **1/1 aprovado**.
- Publicação: pendente sincronização do commit deste lote e confirmação via `/api/version`.

### Lote visual — Registro de riscos (13/11/2026)

- Rota ajustada: `/portal/risks`.
- Alterações visíveis: cabeçalho compartilhado e feedback semântico padronizado, mantendo os estados e o fluxo de tratamento existentes.
- Verificação: `operational-page-header-contract.test.ts` — **1/1 aprovado**.
- Publicação: pendente sincronização do commit deste lote e confirmação via `/api/version`.

### Lote visual — Não conformidades e melhorias (13/11/2026)

- Rota ajustada: `/portal/nonconformities`.
- Alterações visíveis: cabeçalho compartilhado e feedback semântico padronizado, mantendo a jornada de origem, análise causal, ação corretiva e eficácia.
- Verificação: `operational-page-header-contract.test.ts` — **1/1 aprovado**.
- Publicação: pendente sincronização do commit deste lote e confirmação via `/api/version`.

### Regressão direcionada — Field Service / RTO / BM (13/11/2026)

- Comando: `npx vitest run tests/field-service-end-to-end-contract.test.ts tests/field-service-closure-contract.test.ts tests/field-service-review-api.test.ts tests/field-service-rto-api.test.ts tests/field-service-rto-storage.test.ts tests/field-partner-evidence-upload.test.ts tests/measurement-generation-contract.test.ts tests/measurement-pdf-route-contract.test.ts --reporter=dot`.
- Resultado: **8 arquivos / 13 testes aprovados**.
- Cobertura: fila de revisão, pré-condições de encerramento, API de revisão, geração/armazenamento/download de RTO, upload de evidências e rotas de geração/PDF do BM.
- Limitação: o runner reporta timeout de encerramento do processo do Vitest após os testes, mas os 13 testes finalizaram aprovados; ciclo autenticado sintético com mutação real continua pendente.

### Regressão de isolamento e autorização (13/11/2026)

- Comando: `npx vitest run tests/ticket-child-rls-isolation.test.ts tests/auth-rbac-contract.test.ts tests/db-integrity-audit.test.ts tests/production-persistence-boundary.test.ts tests/production-demo-isolation.test.ts --reporter=dot`.
- Resultado: **5 arquivos / 10 testes aprovados**.
- Cobertura: RLS de entidades filhas, RBAC, integridade entre organizações, fronteira de persistência de produção e isolamento do modo demo.
- Limitação: permanece pendente somente a reprodução autenticada negativa com dois tenants reais/controlados; não há credencial secundária disponível para executar isso sem inventar evidência.

### Regressão operacional ampliada (13/11/2026)

- Comando direcionado executado sobre validação, revisão, RTO, despacho e caminhos de produção.
- Resultado: **9 arquivos / 16 testes aprovados**.
- Cobertura: fluxo de validação, integridade e concorrência da revisão, histórico e imutabilidade de RTO, despacho atômico, mapeamento operacional e persistência de produção.

### Correção de cancelamento seguro de chamados (13/11/2026)

- Auditoria confirmou que o botão ficava desabilitado sempre que havia qualquer `field_progress`, inclusive em chamados de teste já concluídos. Isso divergia da regra operacional desejada de retirar o chamado da fila preservando histórico.
- Migration criada: `supabase/migrations/20261113120000_allow_safe_ticket_cancellation_after_execution.sql`.
- A função `cancel_ticket` continua exigindo perfil de gestão, versão otimista e bloqueia apenas chamados administrativamente encerrados; a operação é cancelamento lógico (`CANCELLED`) e mantém OS, evidências, RTO/BM e `audit_logs`.
- **Pendência de infraestrutura:** a migration ainda precisa ser aplicada no Supabase de produção e confirmada por consulta; não foi executada automaticamente para evitar alteração não verificada no banco real.
- A fila foi ajustada no commit `a443108`: a ação deixa de ser desabilitada apenas pela existência de `field_progress`; permanece bloqueada somente para chamados administrativamente encerrados ou estados não canceláveis. O RPC continua sendo a autoridade final e rejeita conflitos de versão/permissão.
- Teste direcionado: `tests/tickets-queue-ui-contract.test.ts` — **3/3 aprovados**. `git diff --check` limpo.
- Teste adicional: `tests/ticket-cancel-after-execution.test.ts` junto ao contrato da fila — **2 arquivos / 5 testes aprovados**.
- Publicação: commits locais `500ed76` e `a443108`; `git push`/deploy estão bloqueados nesta sessão por falha DNS ao resolver `github.com`.

### Lote visual P2 — Planos de ação (13/11/2026)

- `/portal/action-plans` foi reorganizada em fluxo de criação + acompanhamento, com cabeçalho OneIT, formulário contextual, estados sem dados e controles de atualização agrupados.
- Verificação: ESLint (formatter stylish) e `npm run typecheck` concluídos com exit code 0; `git diff --check` aprovado.

### Lote visual P2 — Auditorias internas (13/11/2026)

- `/portal/internal-audits` recebeu cabeçalho OneIT, cartões de planejamento/listagem e feedback semântico, sem alteração nas actions de auditoria, constatações ou vínculo com NC.
- Verificação: ESLint da rota concluído com exit code 0; `git diff --check` executado.

### Lote visual P2 — Documentos controlados (13/11/2026)

- `/portal/controlled-documents` recebeu cabeçalho OneIT, formulário/lista em cartões compartilhados e melhor hierarquia para versão, submissão e aprovação.
- Verificação: ESLint da rota concluído com exit code 0; contratos de actions preservados.

### Lote visual P2 — Aprovações (13/11/2026)

- `/portal/approvals` recebeu cabeçalho OneIT e superfícies compartilhadas para solicitar e decidir aprovações, sem alterar a segregação do aprovador.
- Verificação: ESLint da rota concluído com exit code 0.

### Lote visual P2 — GMUD / Change Enablement (13/11/2026)

- `/portal/changes` recebeu cabeçalho OneIT e superfícies compartilhadas para criação e acompanhamento de mudanças.
- Verificação: ESLint da rota concluído com exit code 0; planos de risco, teste e rollback preservados.

### Regressão consolidada dos lotes recentes (13/11/2026)

- Contratos da fila/cancelamento/cabeçalho: **3 arquivos / 6 testes aprovados**.
- `npm run typecheck`: concluído com exit code 0.
- Observação: o Vitest exibiu apenas o aviso conhecido de timeout de encerramento do processo após os testes; os testes finalizaram aprovados.
- Auditoria adicional: `npm run audit:migrations:strict` — **197 migrations, nenhum alerta estático**; `git diff --check` limpo.

