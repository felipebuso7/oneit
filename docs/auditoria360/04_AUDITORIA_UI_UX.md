# Auditoria UI/UX — achados e verificação da operação Field Service

## Fatos observados

- Existe shell autenticado e componentes compartilhados para cabeçalho, seção, KPI, tabela, filtros, estados e badges.
- O Field Service possui necessidades diferentes de listas administrativas: fila, agenda, mapa e despacho precisam coexistir.
- Ainda existem rotas demo/SGSTI com estilos locais e layouts próprios, portanto a aplicação não está visualmente 100% unificada.
- O menu de demonstração ainda guardava uma preferência antiga de minimização sem oferecer um controle para reabri-lo. A navegação agora permanece expandida no desktop e vira um menu fechado por padrão no mobile.
- A rota antiga `/demo/field-service` ainda existe para funções de acompanhamento. Ela apareceu como opção principal ao lado da fila nova e confundia qual era a tela vigente. O menu principal passou a apontar apenas para a visão geral, fila e validação do Field Service.
- A auditoria visual de todas as rotas não foi executada.

## Verificação visual e correções deste ciclo

- A fila `/demo/field-service/queue-v2` apresentava dados operacionais misturados com um painel lateral e ações repetidas. Agora usa filtros de situação em abas, busca, região e uma lista única com a próxima ação por OS. O painel de detalhe foi retirado da fila. Em tela estreita, as OS usam linhas compactas; os filtros não exigem rolagem horizontal.
- A validação `/demo/field-service/validation-v2` destoava do padrão azul e cinza com áreas roxas e um bloco explicativo que ocupava espaço. Agora usa o mesmo cabeçalho e superfícies da fila, lista de OS pendentes e conferência contextual de execução, evidências, materiais e assinatura.
- A ausência de materiais deixou de ser apresentada como pendência. A LPU é uma decisão de composição e cobrança do gestor; evidência pode ser foto ou justificativa, conforme a validação existente do chamado.
- A visão geral `/demo/field-service/overview` foi reduzida aos indicadores e pendências que encaminham para a fila operacional.
- Em largura próxima de 744 px, o menu antigo ocupava grande parte da tela antes do conteúdo. O menu mobile foi recolhido para uma barra de 64 px com botão de abertura. Essa largura foi inspecionada no navegador integrado antes da última alteração de CSS; a inspeção visual completa após a alteração ainda está pendente.
- As duas rotas responderam HTTP 200 em `localhost:3000`. ESLint direcionado e `tsc --noEmit` passaram. Isso não valida o fluxo operacional ponta a ponta.

## Lacunas relevantes ainda abertas

1. A fila de demonstração lê `localStorage`; não há evidência neste ciclo de persistência centralizada ou sincronização multiusuário nessa tela.
2. O despacho, a agenda e o mapa ainda são rotas separadas. A central única com decisão contextual, disponibilidade e conflitos não está concluída.
3. A decisão final de validação e fechamento continua na tela de Chamados. A nova tela de validação permite conferir dados antes de navegar até a decisão; a unificação transacional desses fluxos exige revisão das regras existentes.
4. A rota antiga de acompanhamento ainda contém uma interface densa. Foi removida da navegação principal, mas precisa de revisão antes de ser usada como parte da experiência final.
5. Não houve validação visual em desktop amplo, telefone real e todas as telas do produto.

## Problemas de experiência a validar

1. O usuário pode confundir chamado, OS e fila de validação se o contexto não estiver explícito no cabeçalho.
2. Ações primárias podem estar espalhadas entre detalhe, despacho e agenda.
3. Dashboards precisam permitir drill-down para a lista que compõe o indicador.
4. Estados vazios, erro e carregamento devem ser comparados entre portal e telas demo.
5. A tela mobile precisa ser testada em toque real; lint não comprova ergonomia.

## Diretrizes de correção

- Uma ação primária por superfície.
- Painel lateral para despacho e detalhe contextual.
- Status separados para chamado, execução, agendamento e disponibilidade.
- Tabelas para volume; cards somente para resumo.
- Mensagens de feedback após qualquer mutação.
- Foco, contraste e áreas clicáveis compatíveis com WCAG AA.

## Limitação

A inspeção visual deste ciclo cobriu fila e validação vazias em uma janela estreita do navegador integrado. A revisão de OS com dados reais, imagens e assinatura em diferentes larguras ainda é necessária. Isso não representa uma auditoria visual global nem comprova que a experiência já está pronta para produção.
