# Auditoria 360 — ONEIT

Data da execução: 2026-11-26

## Escopo e evidências

Foi inspecionado o repositório `servicia-fsm`, sua árvore de rotas, migrations, scripts, testes, configuração de build e histórico Git. O inventário encontrou 159 páginas, 72 rotas de API e 217 migrations versionadas. `npm run audit:migrations:strict` foi executado e retornou “Nenhum alerta estático encontrado”.

Não foi possível comprovar, nesta execução, uma sessão autenticada completa no navegador nem consultar o deployment público atualizado: o endpoint público ainda reportava o commit anterior `e25949b`, enquanto o código validado foi enviado como `e7fbabb`. Build, typecheck e Vitest ultrapassaram o limite operacional do ambiente sem resultado final; portanto não são considerados aprovados.

## Achados confirmados

| ID | Severidade | Área | Evidência | Estado |
|---|---|---|---|---|
| FE-001 | P1 | Abertura de chamados | Solicitantes eram filtrados apenas por organização, permitindo opções de outra empresa | Corrigido em `e7fbabb`; filtro por cliente e busca adicionados |
| DB-001 | P1 | Integridade | Trigger aceitava solicitante ativo da mesma organização, sem exigir o mesmo cliente | Corrigido pela migration `20261127110000_ticket_requester_customer_guard.sql`, aplicada no Supabase |
| FUNC-001 | P1 | Solicitantes | Atualização de status não enviava motivo nem a nova assinatura RPC | Corrigido em `e7fbabb`; motivo obrigatório para inativação |
| QA-001 | P1 | Release | Deployment público comprovado ainda aponta para `e25949b` | Aberto: aguardar/acionar deployment Vercel |
| QA-002 | P1 | Quality gate | `tsc`, build e Vitest não concluíram no limite operacional | Aberto: executar em CI ou ambiente com limite maior |
| CODE-001 | P2 | Código | Rotas demo contém arrays/fallbacks locais; não devem ser tratadas como produção | Aberto: delimitar ou remover exposição de demos |

## Limitações

RLS, performance real, Storage privado, e-mails, geolocalização e fluxos E2E autenticados exigem credenciais/ambiente externo e não foram declarados aprovados sem evidência.
