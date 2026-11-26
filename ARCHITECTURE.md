# Arquitetura

Next.js App Router + TypeScript no frontend/backend, Supabase/PostgreSQL como persistência e RLS como fronteira de tenant. Rotas server-side usam `requireUser`; operações sensíveis preferem RPCs versionadas. Storage privado usa URLs assinadas. Detalhes: [docs/architecture.md](docs/architecture.md), [docs/authentication-rbac.md](docs/authentication-rbac.md) e [docs/OPERABILITY.md](docs/OPERABILITY.md).
