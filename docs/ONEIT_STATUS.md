# OneIT — status de continuidade

Atualizado em 12/11/2026.

## Último lote validado

- Em andamento: redesign estrutural da Home autenticada. O estado anterior foi capturado no domínio oficial; a nova composição está implementada localmente e aguarda publicação em preview para comparação pós-deploy.
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

Após o deployment de `main` ficar Ready, validar dinamicamente as rotas de chamados, agendamento, agenda, validação e RTO no domínio oficial; depois tratar o primeiro P1 reproduzível.
