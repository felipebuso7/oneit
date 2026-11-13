# OneIT — backlog priorizado

## P0

- Nenhum P0 novo comprovado neste lote.

## P1

- Executar E2E autenticado do ciclo chamado → agendamento → técnico → validação → RTO/BM. Contratos automatizados aprovados; validação dinâmica ainda pendente. **Smoke autenticado em produção confirmado em 12/11/2026:** `/portal/review` carregou 2 OS aprovadas, uma com RTO pendente e outra com RTO baixável/encerramento disponível; isso não substitui o ciclo completo.
- Confirmar em ambiente autenticado que os filtros de organização não expõem dados entre tenants.
- **Correção preparada:** migration `20261113090000_harden_ticket_child_rls.sql` restringe leitura de checklist, execução, materiais, evidências, conclusões, revisões, relatórios e agendas a gestão da organização ou técnico atribuído. Testes contratuais aprovados; aplicação no Supabase ainda pendente de homologação.
- Validar tecnicamente upload de evidências e armazenamento do RTO com dados sintéticos. Contratos automatizados aprovados; endpoint de prontidão de produção respondeu `200 {status:"ready", deploymentMode:"supabase"}` em 12/11/2026, mas ainda falta um upload sintético real autenticado.

## P2

- Revisar visualmente todas as telas operacionais em viewport estreito. **Telas priorizadas verificadas:** captura renderizada autenticada da fila `/portal/tickets` confirmou em produção o redesign do commit `67b0719`; a tela de Agendamento de OS recebeu refinamento estrutural no commit `9c96081` (cabeçalho, filtro de data e hierarquia do conteúdo). **Entrega adicional:** a fila agora usa cartões responsivos abaixo de `lg` no commit `9452d14`, mantendo a tabela somente para desktop para evitar rolagem lateral em telas menores. **Achado estático adicional:** há 40+ rotas administrativas legadas sem `OneitPageHeader`; a migração visual deve ser feita por ondas, começando pelas rotas de operação já priorizadas, sem alterar contratos de negócio.
- Consolidar tokens e estados de tabelas, filtros, formulários e mensagens.
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
