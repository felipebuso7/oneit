# Validação Supabase — OneIT

Data: 12/11/2026

## Consulta executada

`npx supabase migration list --linked`

## Resultado

Bloqueado antes da consulta das migrations. O CLI falhou ao criar a login role por timeout:

`DbConfigLoginRoleStatusError — Failed to create login role: Connection terminated due to connection timeout`

Nenhuma migration foi aplicada e nenhum dado foi alterado.

## Impacto

Não é possível afirmar que as migrations locais novas estejam aplicadas no projeto remoto. A homologação E2E permanece bloqueada até haver conectividade estável ou acesso equivalente ao banco de homologação.

## Próxima ação

Repetir a consulta em uma janela de conectividade estável e comparar a lista remota com `supabase/migrations`. Não executar `db push` automaticamente.

## Prontidão de ambiente local

`npm run check:production-env` identificou ausência local de:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ONEIT_APP_URL`
- `ONEIT_DEPLOYMENT_MODE`

Os nomes foram registrados sem expor valores. Isso impede smoke autenticado local; não prova que as variáveis estejam ausentes na Vercel.
