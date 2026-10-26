# Inventário funcional inicial — OneIT

Data: 2026-10-25  
Base: repositório local auditado, sem acesso a PostgreSQL/Supabase de homologação.

## Evidências objetivas

- 221 arquivos de rota `page.tsx`/`route.ts` em `src/app`.
- 31 componentes em `src/components`.
- 80 arquivos de teste em `tests`.
- 162 migrations em `supabase/migrations`.
- Foi detectado prefixo temporal duplicado em duas migrations (`20261024120000`); a ordem efetiva e o checksum precisam ser confirmados no mecanismo de deploy antes de qualquer alteração.
- Runtime Next.js 16.3.7, React 19.2.8, Node 20 no Docker e CI.
- 75 arquivos em `src/app/demo` usam `localStorage`, estado demonstrativo ou `DemoSidebar`; nenhuma rota autenticada em `src/app/(portal)` apareceu nessa busca.

## Mapa de módulos

| Módulo | Rotas/áreas observadas | Estado auditável |
|---|---|---|
| Autenticação | login, recuperação, OIDC, logout | Funcional em contrato; sessão e provedor real ainda não homologados |
| Portal e shell | layout autenticado, sidebar, dashboard | Funcional e validado por lint/testes; revisão visual completa ainda pendente |
| Chamados | fila, detalhe, revisão, fechamento, catálogo | Parcialmente validado; integração externa de chamados não comprovada |
| Field Service | despacho, agenda, rotas, técnico parceiro, revisão, RTO | Fluxo principal coberto por contratos; mapa/roteirização real e dispositivo móvel não homologados |
| Cadastros | técnicos, empresas/polos, LPU, clientes, organizações | APIs e contratos existem; jornada completa de implantação não validada em banco real |
| Financeiro/BM | medição, fiscal, contestação, versões, e-mail | Regras e APIs existem; worker de envio e provedor real não comprovados |
| SGSTI/ITSM | governança, riscos, documentos, auditorias, problemas, mudanças | Muitas telas demonstrativas e persistências locais; separar demonstração de produção é pendência |
| Relatórios | RTO, relatórios operacionais e PDFs | Geração PDF coberta por testes; download visual e anexos reais dependem de ambiente |
| Integrações | WhatsApp, e-mail, Supabase/self-hosted, mapas | WhatsApp abre conversa preparada; entrega oficial, OAuth e mapas reais não validados |

## Conclusão inicial

O produto possui ampla superfície funcional e uma base de contratos automatizados, porém a existência de rotas não comprova operação integrada. Os maiores gaps são homologação de persistência real, separação entre demo e produção, worker financeiro e execução de jornadas ponta a ponta em ambiente seguro.
