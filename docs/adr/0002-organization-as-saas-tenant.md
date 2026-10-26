# ADR 0002 — Organização como tenant SaaS inicial

## Contexto

O OneIT já usa `organizations` como chave de isolamento em entidades de negócio, RBAC, RLS, auditoria, storage e outbox. A evolução SaaS precisa de configurações, branding, planos e provisionamento, mas criar agora uma tabela `tenants` independente duplicaria o limite de segurança sem uma relação de negócio definida.

## Decisão

Na fase atual, uma `organization` é um tenant SaaS lógico. Novas configurações de tenant serão armazenadas como extensões um-para-um da organização e continuarão usando `organization_id` como chave de isolamento.

`customers` continuam sendo clientes atendidos dentro de uma organização; não são tenants da plataforma. O produto mantém um único código-base e configura comportamento por organização, RBAC e feature flags.

## Evolução prevista

Se houver uma necessidade confirmada de holding, revenda, operação multiempresa sob o mesmo contrato ou banco dedicado Enterprise, será criado um modelo explícito de `saas_tenants` e um plano de migração. Essa mudança exigirá backfill, adaptação de todas as políticas RLS, testes de exportação/storage/jobs e uma estratégia de rollback; não será uma simples troca de nome de coluna.

## Consequências

- Evita duas fronteiras de isolamento concorrentes.
- Permite branding, locale, timezone, limites e flags por organização agora.
- Banco dedicado por cliente continua uma opção futura de infraestrutura, não uma premissa atual do schema.
- O Super Admin SaaS e impersonation de suporte continuam pendentes de política formal, autorização excepcional e auditoria reforçada.
