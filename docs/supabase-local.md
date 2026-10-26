# Supabase local

## O que está configurado

- A CLI foi inicializada em `supabase/config.toml`.
- A migration da fundação está em `supabase/migrations`.
- O projeto local usa as portas padrão da CLI; Docker é requisito da CLI para iniciar os serviços.

## Primeiro uso local

1. Instale e inicie o Docker Desktop.
2. Execute `npx supabase start` na raiz do projeto.
3. Copie a URL e a chave `anon` exibidas para `.env.local`.
4. Execute `npx supabase db reset` para aplicar migrations e seeds.
5. Crie a primeira identidade no Auth e faça o bootstrap do perfil e papel administrativo usando a função `bootstrap_organization` exclusivamente em contexto server-side com `service_role`.

Não incluir `.env.local`, chaves `service_role` ou exports de produção no Git.

## Projeto remoto

Antes de vincular um projeto remoto, criar ambientes independentes para dev, staging e produção. O vínculo remoto e o deploy de migrations exigem credenciais de um responsável autorizado.
