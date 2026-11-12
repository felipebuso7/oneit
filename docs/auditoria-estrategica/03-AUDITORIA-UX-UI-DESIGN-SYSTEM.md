# Auditoria UX/UI e Design System

## Evidência atual

O portal possui shell e componentes compartilhados (`src/components/portal-sidebar.tsx`, `portal-sidebar-v2.tsx`, `src/app/globals.css`). A superfície demo contém padrões próprios e persistência local (`src/components/demo-sidebar.tsx`, `src/app/demo/**`). Em produção, `/demo` é bloqueado por `src/proxy.ts:14-17`; em desenvolvimento, o layout portal redireciona para `/demo` (`src/app/(portal)/layout.tsx:16`). Isso explica percepção de versões divergentes, mas não prova defeito no portal.

## Achados

| Área | Problema verificável | Impacto | Prioridade |
|---|---|---|---|
| Navegação | duplicidade portal/demo e nomenclaturas históricas | usuário não sabe qual é fonte oficial | P1 |
| Densidade | Field Service combina fila, agenda, rotas e revisão em famílias amplas | carga cognitiva alta | P1 |
| Formulários | padrões e estados precisam matriz comum | erros silenciosos e retrabalho | P2 |
| Tabelas | inventário amplo, sem evidência de validação visual por breakpoint | legibilidade/uso móvel | P2 |
| Acessibilidade | não há resultado automatizado WCAG global | risco não quantificado | P2 |

## Design System alvo (sem implementação nesta fase)

Tokens semânticos: `surface`, `text`, `border`, `primary`, `warning`, `danger`, `success`; escala de espaçamento 4/8/12/16/24/32; foco visível; botões com uma ação primária por contexto; tabelas com estado vazio/carregamento/erro; drawer para despacho e review; breadcrumbs somente quando ajudam.

## Critérios de aceite futuros

Cada tela deve declarar tarefa primária, estado de carregamento, vazio, erro, sucesso e permissão; passar teclado/foco/contraste; não haver overflow em 360, 768 e 1440 px; e reutilizar `PageHeader`, `FilterBar`, `DataTable`, `Drawer` e `StatusBadge`.

## Limitação

Não foi executada captura visual de 100% das telas nesta auditoria. Portanto, afirmações sobre desalinhamentos específicos são hipóteses a confirmar em uma rodada visual automatizada.
