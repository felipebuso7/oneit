# Arquitetura da fundação

## Fatos confirmados

- O produto é um FSM multiempresa/multicontrato; não substitui ServiceNow ou Milldesk.
- O stack inicial é Next.js, TypeScript, Supabase/PostgreSQL e Vercel.
- Isolamento por organização, RBAC, RLS, storage privado, migrations e auditoria são requisitos de base.
- A primeira entrega não inclui tickets nem integração real com Milldesk.

## Decisões implementadas

- A hierarquia é `organizations -> customers -> contracts`.
- Usuários são identidades de `auth.users`; `user_profiles` e `user_roles` atribuem perfil e acesso organizacional.
- Funções de autorização centralizam checagens de associação e RBAC, reduzindo políticas RLS repetidas.
- Para a fase SaaS inicial, cada `organization` é um tenant lógico. A decisão e os critérios para futura separação estão em [ADR 0002](adr/0002-organization-as-saas-tenant.md).
- O mapa obrigatório de cadastros mestres e relações operacionais está em [master-data-and-administration.md](master-data-and-administration.md).

## Pendências bloqueantes para produção

- Provisionar Supabase dev e criar o primeiro administrador com procedimento seguro.
- Obter documentação e credenciais da API Milldesk; nenhuma API foi presumida.
- O deploy pode consultar `GET /api/health` para liveness e `GET /api/ready` para verificar a presença das configurações públicas mínimas. `ready` não confirma conectividade real com Supabase; esta verificação permanece de responsabilidade da homologação/monitoramento de infraestrutura.
