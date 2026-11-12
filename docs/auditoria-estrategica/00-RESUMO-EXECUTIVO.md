# Resumo executivo

## Parecer

**Recomendação: APTO PARA HOMOLOGAÇÃO CONTROLADA; NÃO APTO PARA declarar produção plenamente homologada.**

O produto possui uma base técnica funcional: build e typecheck passam, há 309 testes aprovados, o portal publicado responde com `/api/health` e `/api/ready?storage=1`, e o staging Supabase está alinhado às migrations locais. Isso é fato verificado.

Ainda existem riscos estruturais: coexistência de uma superfície demo/legada com persistência em `localStorage`, jornada ponta a ponta não comprovada por teste automatizado, cobertura de RLS/RBAC entre organizações não demonstrada, integração externa de e-mail/WhatsApp não comprovada e catálogo/cadastros com conceitos que precisam ser consolidados. Portanto, a maturidade é suficiente para homologação, não para afirmar operação corporativa sem ressalvas.

## Dez achados prioritários

| ID | Achado | Severidade | Evidência | Confiança |
|---|---|---|---|---|
| P0-01 | E2E completo do chamado até RTO/BM ainda não está demonstrado automaticamente | Alta | `docs/auditoria360/29_ROTEIRO_HOMOLOGACAO_S2_20261028.md`; testes existentes cobrem partes | Alta |
| P0-02 | Isolamento entre organizações precisa de teste com dois usuários/tenants | Crítica potencial | RLS em `supabase/migrations/20260930121000_foundation.sql`; não há evidência dinâmica multi-tenant | Média |
| P1-01 | Duas superfícies de produto: portal real e `/demo`; demo contém `localStorage` | Alta | `src/proxy.ts:14-17`; `src/app/demo/**`; buscas de `localStorage` | Alta |
| P1-02 | Domínio de Field Service é amplo e atravessa tickets, agendas, eventos, execução, review, LPU e RTO | Alta | migrations `20260930130000` a `202610...`; APIs `/api/field-service/**` | Alta |
| P1-03 | Modelo de técnico canônico existe em `technicians`, mas legado/histórico exige reconciliação | Alta | `supabase/migrations/20260930121000_foundation.sql:36`; docs anteriores citam `field_service_technicians` | Média |
| P1-04 | LPU e composições estão implementadas em rotas distintas e foram aplicadas ao staging somente nesta auditoria | Alta | `src/app/api/field-service/lpu/**`; migrations `20261028180500` e `20261028210000` | Alta |
| P1-05 | Função de banco é drop/recreate em migration, risco de dependência e rollback | Alta | `20261028193000_partner_context_details.sql`; `audit-migrations --strict` | Alta |
| P2-01 | Catálogo mistura conceito de serviço solicitável com configurações e legado demo | Média | `/portal/service-catalog`, `/demo/settings/service-catalog` | Alta |
| P2-02 | Auditoria visual de 100% das telas não é possível somente pelo código | Média | inventário possui dezenas de rotas; nenhuma captura automatizada global nesta fase | Alta |
| P2-03 | Lint do Supabase possui dois warnings de qualidade de função | Média | `db lint --linked --fail-on warning` | Alta |

## Nota de maturidade preliminar (0–5)

| Dimensão | Nota | Justificativa |
|---|---:|---|
| Arquitetura | 3 | monólito modular sustentável, porém com demo/legado paralelo |
| Dados | 3 | constraints e RLS presentes; reconciliação e testes de isolamento pendentes |
| Backend | 3 | RPCs transacionais e APIs estruturadas; E2E e idempotência precisam prova |
| Segurança | 3 | portal protegido e produção sem `/demo`; revisão multi-tenant e parceiros pendente |
| UX/fluxos | 2,5 | superfície ampla e jornadas ainda não homologadas ponta a ponta |
| Desempenho | 3 | build saudável; não há benchmark de carga real |
| Testabilidade | 3,5 | 309 testes passam; lacunas E2E, visual e RLS |
| Operação/VPS | 3 | health/readiness e env de produção presentes; backup/restore não testado |

## Recomendação estratégica

Adotar **B — refatoração modular e redesenho das jornadas**, preservando o portal, as migrations e componentes comprovadamente saudáveis. Não há evidência para reescrita total; há evidência para contenção da demo, consolidação do domínio, testes de autorização e uma homologação E2E controlada.
