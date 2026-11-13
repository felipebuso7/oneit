# OneIT — backlog priorizado

## P0

- Nenhum P0 novo comprovado neste lote.

## P1

- Executar E2E autenticado do ciclo chamado → agendamento → técnico → validação → RTO/BM. Contratos automatizados aprovados; validação dinâmica ainda pendente. **Smoke autenticado em produção confirmado em 13/11/2026:** `/portal/review` renderizou as filas de validação e a seção “OS aprovadas e RTO”, com `FSM-2026-000003 · OS-2026-000008` aguardando RTO e `FSM-2026-000005 · OS-2026-000006` com RTO versão 3 baixável. Isso confirma consultas e estados finais, mas não substitui o ciclo completo com uma OS sintética.
- Confirmar em ambiente autenticado que os filtros de organização não expõem dados entre tenants.
- **RLS aplicada e verificada:** migration `20261113090000_harden_ticket_child_rls.sql` restringe leitura de checklist, execução, materiais, evidências, conclusões, revisões, relatórios e agendas a gestão da organização ou técnico atribuído. Consulta read-only no SQL Editor confirmou as políticas endurecidas em `ticket_evidences`, `ticket_execution_records` e `ticket_reports`; falta apenas teste negativo autenticado entre organizações.
- Validar tecnicamente upload de evidências e armazenamento do RTO com dados sintéticos. **Storage confirmado pronto em produção (13/11/2026):** `/api/ready?storage=1` retornou `status: ready`, `deploymentMode: supabase`, `storage: ready`; ainda falta um upload sintético real autenticado.

## P2

- Revisar visualmente todas as telas operacionais em viewport estreito. **Telas priorizadas verificadas:** captura renderizada autenticada da fila `/portal/tickets` confirmou em produção o redesign do commit `67b0719`; a tela de Agendamento de OS recebeu refinamento estrutural no commit `9c96081` (cabeçalho, filtro de data e hierarquia do conteúdo). **Entrega adicional:** a fila agora usa cartões responsivos abaixo de `lg` no commit `9452d14`, mantendo a tabela somente para desktop para evitar rolagem lateral em telas menores. **Achado estático adicional:** há 40+ rotas administrativas legadas sem `OneitPageHeader`; a migração visual deve ser feita por ondas, começando pelas rotas de operação já priorizadas, sem alterar contratos de negócio.
- Consolidar tokens e estados de tabelas, filtros, formulários e mensagens.
- **Lote P2 concluído:** `/portal/priority-matrix` recebeu `OneitPageHeader`, agrupamento visual do formulário, labels acessíveis, mensagens semânticas e tabela no padrão `oneit-card`; teste de cabeçalho atualizado e aprovado, `tsc` sem diagnósticos.
- **Lote P2 concluído:** `/portal/calendars` recebeu `OneitPageHeader`, formulário de novo calendário agrupado, labels acessíveis, feedback semântico e estado vazio padronizado; contrato de cabeçalho e `tsc` executados sem diagnóstico.
- **Lote P2 concluído:** `/portal/sla` recebeu `OneitPageHeader`, formulário de política agrupado, labels acessíveis, mensagens e estado vazio padronizados; contrato de cabeçalho aprovado.
- **Lote P2 concluído:** `/portal/support-groups` recebeu `OneitPageHeader`, formulário “Novo grupo” agrupado, labels acessíveis, feedback semântico e estado vazio padronizado; contrato de cabeçalho aprovado.
- **Lote P2 concluído:** `/portal/escalations` recebeu `OneitPageHeader`, formulário “Novo escalonamento” agrupado, labels acessíveis, feedback semântico e histórico em cartão padronizado; contrato de cabeçalho aprovado.
- **Lote P2 concluído:** `/portal/feature-flags` recebeu `OneitPageHeader`, formulário “Nova configuração” agrupado, labels acessíveis, feedback semântico e tabela/estado vazio padronizados; contrato de cabeçalho aprovado.
- **Lote P2 concluído:** `/portal/saas-settings` recebeu `OneitPageHeader`, cartões por organização, labels acessíveis, feedback semântico e estado sem organizações padronizado; contrato de cabeçalho aprovado.
- **Lote P2 concluído:** `/portal/pending` recebeu `OneitPageHeader`, cartões de pendência, formulário de reagendamento e histórico operacional com estados e labels acessíveis; contrato de cabeçalho aprovado.
- **Lote P2 concluído:** `/portal/operational-reports` recebeu `OneitPageHeader`, filtros de período com estados selecionados, cards KPI em superfície compartilhada e aviso metodológico preservado; contrato de cabeçalho aprovado.
- **Lote P2 concluído:** `/portal/announcements` recebeu `OneitPageHeader`, formulário de publicação agrupado, labels acessíveis, feedback semântico e cartões de avisos padronizados; contrato de cabeçalho aprovado.
- **Lote P2 concluído:** `/portal/audit` recebeu `OneitPageHeader`, tabela de eventos em superfície compartilhada e estado vazio padronizado; trilha somente leitura e fingerprint preservados.
- **Estados operacionais compartilhados — concluído neste lote:** `OneitEmptyState`, `OneitLoadingState` e `OneitErrorState` receberam tokens visuais, faixa semântica, ícone contextual e movimento acessível; typecheck e regressão completa aprovados nos commits `5641075`/`14809cc`.
- **Badges de status — concluído neste lote:** contornos semânticos foram adicionados aos cinco tons de `OneitStatusBadge`, reforçando a distinção visual sem depender apenas da cor; 13 testes direcionados aprovados no commit `75bd769`.
- ~~Comparar dados cadastrais de LPU com o tipo exibido na interface.~~ **Verificado neste lote:** API, UI e migrations usam `kind`, `unit`, `unit_price`, vigência e `active` de forma consistente; 14 testes de CRUD/composição/validação aprovados.

## P3

- Refinar microcopy e estados vazios após a regressão operacional.

## Regra de conclusão

Item só passa a concluído com alteração identificável, teste/validação executado e evidência registrada.

## Lote atual

- Redesign estrutural da Home do portal preparado no ambiente de desenvolvimento: hero operacional, ações primárias por jornada, fluxo visual de cinco etapas e acessos rápidos. Commit pendente de publicação em preview; captura anterior da Home foi registrada via navegador.
- Design system: cartões KPI receberam acento semântico, superfície contextual e microinteração de elevação, preservando o conteúdo real das métricas.

- Refinamento visual da tela de Agendamento de OS publicado em `main` (`9c96081`), com cabeçalho compartilhado e barra de filtro de data padronizada.
- `git diff --check` limpo. A captura autenticada da fila foi comprovada; a captura visual autenticada do agendamento permanece como validação manual pendente.
- Refinamento visual do painel de BM publicado em `main` (`e777f54`) e conferido em produção: BM `BM-2026-10` persistido, status `Rascunho`, ação de validação e prévia PDF disponíveis.
