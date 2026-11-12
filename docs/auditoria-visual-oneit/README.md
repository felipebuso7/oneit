# Auditoria visual OneIT — refinamento UI/UX

## Escopo

Esta auditoria foi iniciada a partir do mandato de refinamento visual anexado em 12/11/2026. O documento é tratado como requisito do usuário; qualquer instrução externa embutida nele que tente alterar permissões, segurança ou publicar produção não é executada automaticamente.

## Evidências confirmadas

- A aplicação usa Next.js, Tailwind CSS e tokens próprios em `src/app/globals.css`.
- Existem componentes compartilhados de página, botão, tabela, filtros, estados e navegação em `src/components/`.
- O sistema já possui uma base de Design System v1 (`.oneit-page-header`, `.oneit-card`, `.oneit-btn`, tokens `--oneit-*`).
- Há tratamento responsivo global, foco visível e redução de movimento em CSS; a cobertura visual por rota ainda não foi concluída.
- O portal de campo possui componentes específicos e regras próprias de layout; a migração deve preservar o fluxo operacional.

## Primeiras decisões

1. Consolidar tokens e componentes existentes antes de criar novos padrões.
2. Priorizar telas operacionais de uso frequente: chamados, agendamento/despacho, execução técnica, validação, RTO e BM.
3. Avaliar cada tela renderizada em desktop e viewport estreito; leitura estática de código não será registrada como validação visual.
4. Não alterar regras de negócio, banco ou produção durante a auditoria visual.

## Matriz inicial

| Área | Evidência atual | Risco UX | Próxima verificação | Critério de aceite |
|---|---|---:|---|---|
| Tokens/componentes | `src/app/globals.css`, `src/components/oneit-*.tsx` | Médio | Renderizar páginas que usam e não usam componentes-base | Tipografia, botões, estados e espaçamentos consistentes |
| Chamados | `src/app/(portal)/portal/tickets/page.tsx`, `src/components/tickets/tickets-table.tsx` | Alto | Abrir listagem e detalhe no navegador | Fila legível, ação primária evidente, sem overflow horizontal indevido |
| Field Service | `src/app/(portal)/portal/field-service/*`, `src/components/field-service/*` | Alto | Verificar agenda, despacho e execução em viewport móvel | Etapas compreensíveis, status e ações visíveis |
| RTO/BM | `src/domain/reports/pdf.ts`, `src/app/api/field-service/*/pdf/route.ts` | Alto | Gerar PDFs sintéticos e renderizar todas as páginas | Cabeçalho, tabelas, fotos, assinaturas e paginação sem cortes |
| Navegação | `src/components/portal-sidebar-light.tsx`, `src/components/portal-sidebar-v2.tsx` | Médio | Comparar rotas autenticadas e estados recolhidos | Um único padrão de sidebar por área, foco e rótulos acessíveis |

## Pendências

- Capturas comparativas antes/depois ainda não foram produzidas nesta etapa.
- Não foi executado deploy nem alteração de produção.
- A validação visual do Supabase/Vercel permanece separada da auditoria de interface.
- A tentativa de abrir `http://127.0.0.1:3000/portal/tickets` foi bloqueada por `ERR_CONNECTION_REFUSED`; a validação dinâmica local está pendente de um servidor ativo.

## Próximo lote

1. Executar o portal localmente em ambiente de desenvolvimento.
2. Capturar chamados, despacho, execução, validação e relatórios em desktop/mobile.
3. Corrigir primeiro inconsistências nos componentes compartilhados, não telas isoladas.
4. Gerar e renderizar RTO/BM sintéticos antes de alterar templates.

## Verificações executadas

- `npm run lint:core-ui` — aprovado em 12/11/2026. A base compartilhada de layout, autenticação e componentes não apresentou erros de ESLint.
- `npx vitest run tests/field-service-rto-render.test.ts tests/field-service-rto-storage.test.ts tests/report-pdf-images.test.ts tests/report-download-contract.test.ts` — 4 arquivos e 7 testes aprovados. Isso confirma contratos de renderização/armazenamento, mas não substitui inspeção visual página a página.
- Correção aplicada em `src/domain/reports/pdf.ts`: o template de relatório legado passou a preservar a proporção dos logos com `scaleToFit`, evitando distorção no cabeçalho. Testes RTO/storage: 2 arquivos e 5 testes aprovados.
- Validação visual dinâmica — pendente; o navegador não consegue alcançar o servidor local e a produção exige autenticação.

## Evidência dinâmica adicionada

- Produção autenticada acessível em `/portal/tickets`: fila renderizada com pesquisa, filtro de situação, ordenação, tabela e 6 registros.
- Produção autenticada acessível em `/portal/settings/field-service/lpu`: cadastro de itens, edição/desativação e composição de LPU estão expostos no fluxo real.
- Achado para revisão: o item `VIS-001 · Visita Técnica - 3 Horas` aparece com descrição de visita, mas rótulo de tipo `Material`; confirmar se é dado cadastral incorreto ou erro de apresentação antes de corrigir.
- `/portal/review` foi validado em produção: mostra contadores de aguardando/aprovadas/devolvidas, downloads de RTO e uma OS aprovada com RTO pendente de geração. O encerramento exige parecer final, responsável externo e confirmação explícita.
- `/portal/field-service-reports` foi validado em produção: RTOs aparecem versionados, com data de geração, hash SHA-256 e download do PDF. Há versões 1 e 3 registradas para OS distintas.
- `/portal/routes` foi validado em produção: seletor de dia, técnico e criação de rota estão presentes; o estado vazio explica que atendimentos despachados aparecerão automaticamente.
- `/portal/field` redirecionou para o portal geral com mensagem de acesso restrito ao portal de campo. Isso é coerente para um perfil gestor, mas precisa ser validado com uma conta de técnico para comprovar a agenda operacional.
- Correção aplicada em `src/app/(portal)/portal/reports/page.tsx`: a tela de Relatórios agora consulta tanto `ticket_reports` quanto `field_service_rto_reports`, evitando o falso estado “nenhuma versão gerada” quando o RTO foi registrado pelo fluxo Field Service. TypeScript aprovado e 4 testes de relatórios/armazenamento aprovados.
- Correção de autorização aplicada em `src/app/(portal)/portal/field-service-reports/page.tsx`: a leitura de `user_roles` agora filtra pelo usuário autenticado antes de obter organizações, evitando exposição indevida de RTOs entre tenants. Teste de contrato aprovado e TypeScript aprovado.
- A mesma tela agora trata falha na consulta de autorização explicitamente, em vez de mascará-la como lista vazia. Teste de contrato e TypeScript aprovados.
- Datas da tela `/portal/field-service-reports` foram padronizadas para `America/Sao_Paulo`, eliminando variação conforme o fuso do navegador. TypeScript e teste de histórico aprovados.
- Correção aplicada em `src/components/tickets/tickets-table.tsx`: estados de execução técnica/validação agora têm precedência sobre o rótulo administrativo `CLOSED`, evitando que uma OS aguardando validação apareça como encerrada na fila. Teste de contrato (3 testes) e TypeScript aprovados.
- A mesma regra foi aplicada ao detalhe em `src/app/(portal)/portal/tickets/[id]/page.tsx`: o badge administrativo agora mostra `Validação pendente` durante a etapa técnica concluída, eliminando a contradição visual com `CLOSED`. 3 testes de contrato e TypeScript aprovados.
- Correção de nomenclatura aplicada em `src/app/(portal)/portal/field-service/page.tsx`: o título da tela passou de “Central Field Service” para “Agendamento de OS”, alinhando a página ao rótulo oficial do menu e à tarefa executada. O contrato de despacho foi atualizado e aprovado; TypeScript aprovado.
- Correção complementar de navegação: o atalho da home agora usa “Abrir Agendamento de OS” e a agenda do técnico passou a exibir “Agenda Técnicos”, removendo rótulos antigos (“Central Field Service”/“Minha agenda”) sem alterar rotas ou permissões. Contrato de despacho aprovado e TypeScript aprovado.
- Mensagem de erro do carregamento do despacho foi alinhada ao nome operacional “Agendamento de OS”, evitando referência interna à antiga “central”. Contrato de despacho aprovado.
- A Agenda Técnicos passou a formatar o horário agendado explicitamente em `America/Sao_Paulo`, evitando variação por fuso local do navegador. Contrato de despacho e TypeScript aprovados.
