# Inventário técnico

- Framework: Next.js 16, React 19, TypeScript 5, Tailwind 4.
- Backend: Route Handlers/server actions, Supabase JS/SSR e PostgreSQL gerenciado.
- Segurança: autenticação Supabase, funções SQL `security definer`, RLS e papéis organizacionais.
- Documentos: PDF via `pdf-lib`; Storage Supabase.
- Testes: Vitest; testes de contratos de API, banco, PDF, offline e health checks.
- Deploy: Vercel (domínio de referência `oneit-okaa1.vercel.app`).
- Estrutura: 159 `page.tsx`, 72 `route.ts`, 217 migrations.
- Configuração: `.env.example`, `.env.local`, `next.config.ts`, `vercel`.
- CI/CD: workflows em `.github/workflows`; deployment efetivo depende do Vercel.
- Demos: `src/app/demo/**` contém dados locais/fallback e deve permanecer claramente separado do portal produtivo.
