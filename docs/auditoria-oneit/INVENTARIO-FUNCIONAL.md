# Inventário funcional inicial — OneIT

Data: 12/11/2026

## Stack confirmada

- Next.js 16.4.3 com App Router e TypeScript.
- Supabase SSR/Auth/Storage/PostgreSQL.
- Vitest 4.1.12, ESLint e build Webpack.
- Vercel configurado no projeto `.vercel/project.json` como `oneit`.

## Módulos encontrados

| Módulo | Rotas principais | Fonte operacional | Situação |
|---|---|---|---|
| Autenticação | `/login`, `/auth/*` | Supabase Auth | Funcional em código; E2E não verificado |
| Portal | `/portal/*` | Supabase | Fonte operacional; E2E pendente |
| Chamados | `/portal/tickets` | tabelas de chamados | Parcialmente verificado |
| Técnicos | `/portal/technicians` | `technicians` + vínculo Field Service | CRUD e despacho pendentes de homologação |
| Despacho/agenda | `/portal/field-service/*`, `/portal/scheduling` | OS, agenda e RPCs | Implementado em código; E2E pendente |
| Execução externa | `/field-service/partner/*` | token, OS, Storage | Implementado em código; upload real pendente |
| Revisão/RTO | `/portal/review` | fila, LPU, RTO | Implementado em código; persistência remota pendente |
| BM/fiscal | APIs e páginas de relatórios | snapshots e migrations | Parcial; worker/e-mail não homologados |
| Demo | `/demo/*` | `localStorage` | Isolada; não é fonte operacional |

## Estado do repositório

Há alterações locais não publicadas e arquivos de auditoria/migrations novos. Nenhuma alteração local foi descartada. A branch atual é `prep/cloud-staging`, à frente do remoto por um commit.
