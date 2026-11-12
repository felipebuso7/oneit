# Auditoria estratégica do OneIT

Auditoria estática e dinâmica limitada, realizada em 28/10/2026, com foco em produto, processos, UX/UI, arquitetura, dados, segurança e qualidade. Nesta fase não foram alterados código, banco, migrations, dependências ou dados de produção.

## Documentos

1. [Resumo executivo](00-RESUMO-EXECUTIVO.md)
2. [Inventário e mapa do sistema](01-INVENTARIO-E-MAPA-DO-SISTEMA.md)
3. [Auditoria funcional e jornadas](02-AUDITORIA-FUNCIONAL-E-JORNADAS.md)
4. [UX/UI e Design System](03-AUDITORIA-UX-UI-DESIGN-SYSTEM.md)
5. [Catálogo de serviços](04-AUDITORIA-CATALOGO-DE-SERVICOS.md)
6. [Arquitetura frontend/backend](05-AUDITORIA-ARQUITETURA-BACKEND-FRONTEND.md)
7. [Banco de dados](06-AUDITORIA-BANCO-DE-DADOS.md)
8. [Segurança e qualidade](07-AUDITORIA-SEGURANCA-E-QUALIDADE.md)
9. [Arquitetura-alvo e decisão técnica](08-ARQUITETURA-ALVO-E-DECISAO-TECNICA.md)
10. [Backlog e roadmap](09-BACKLOG-PRIORIZADO-E-ROADMAP.md)
11. [Plano de validação e regressão](10-PLANO-DE-VALIDACAO-E-REGRESSAO.md)
12. [Dúvidas, premissas e limitações](11-DUVIDAS-PREMISSAS-E-LIMITACOES.md)
13. [Registro do ciclo 1 — correções e validação](12-REGISTRO-CICLO-1.md)
14. [Evolução FSM — produto, fluxos, UI/UX e inovações, 29/10/2026](13-EVOLUCAO-FSM-PRODUTO-UX-20261029.md)
15. [Ciclo de correção — navegação FSM](14-CICLO-NAVEGACAO-FSM.md)
16. [Ciclo de correção — indicadores FSM](15-CICLO-INDICADORES-FSM.md)
17. [Ciclo de correção — próxima ação do chamado](16-CICLO-PROXIMA-ACAO-CHAMADO.md)
18. [Revisão contextual e paginação](17-CICLO-REVISAO-CONTEXTUAL.md)
19. [Validação por personas FSM](23-CICLO-VALIDACAO-PERSONAS-FSM.md)
20. [Retomada do Plano Mestre e matriz única](../RECONCILIACAO_PLANO_MESTRE_20261109.md)

Os resultados abaixo pertencem ao levantamento de 28/10. O documento 13 distingue a inspeção da aplicação publicada, as evidências de código e as verificações ainda pendentes; não representa homologação integral nem nova publicação.

## Escopo e evidências

- Repositório auditado: `servicia-fsm`, branch `prep/cloud-staging`, commit `2815fc935916b36dd43b7ca737a8d5eb8040b020`.
- Stack identificada: Next.js 16.4.3, React 19, TypeScript, Supabase/PostgreSQL, Tailwind 4, Vitest, `pdf-lib`, `sharp`.
- Validações executadas: build, typecheck, 309 testes Vitest, auditoria estática de migrations, Supabase staging e endpoints públicos de saúde/versionamento.
- Escopo não verificado: homologação humana de todas as rotas, teste real de entrega WhatsApp/e-mail, teste multi-organização com usuários distintos e restauração de backup.
