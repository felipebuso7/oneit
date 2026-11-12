# Segurança e qualidade

## Confirmado

- Portal exige sessão em `src/app/(portal)/layout.tsx:20-21`.
- Produção bloqueia `/demo` e `/api/demo` em `src/proxy.ts:15-17`.
- Produção responde health/readiness e possui variáveis Supabase/Vercel configuradas.
- RLS e funções de papel existem nas migrations fundacionais.

## Não confirmado

- Matriz completa de RBAC por ação e organização.
- Teste de IDOR/BOLA entre organizações.
- Rotação/expiração de tokens de parceiro e restauração de backup.
- Entrega real de WhatsApp/e-mail e evidência de provider.

## Qualidade

`npm test -- --run`: 150 arquivos/309 testes aprovados. `npm run typecheck` e `npm run build` aprovados. Lint de migrations só falha por dois warnings já descritos. Não há prova de cobertura suficiente para E2E, visual, carga e RLS.

## P0/P1 de segurança

Testar acesso direto a tickets, RTO, uploads e partner context com usuário de outra organização; limitar logs; validar MIME/tamanho/antivírus de upload; expirar tokens; garantir que link público de técnico só alcance a OS autorizada.
