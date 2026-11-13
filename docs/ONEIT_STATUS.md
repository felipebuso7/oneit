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

