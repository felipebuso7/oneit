# Primeiro administrador

O bootstrap cria uma única organização, perfil e papel `SUPER_ADMIN`. Ele só pode ser executado em ambiente seguro, pois usa a `SUPABASE_SERVICE_ROLE_KEY`; jamais execute no browser ou exponha essas variáveis em logs.

## Pré-requisitos

1. Projeto Supabase de homologação ou produção criado.
2. Todas as migrations aplicadas com sucesso.
3. `.env.production` com `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `ONEIT_INITIAL_ADMIN_PASSWORD` (mínimo de 12 caracteres).

## Execução

No diretório do projeto, em sessão administrativa segura:

```text
npm run bootstrap:admin -- --email admin@empresa.com --name "Nome do Administrador" --legal-name "Empresa LTDA" --display-name "Empresa"
```

O script interrompe quando encontra perfil com o mesmo e-mail ou organização com a mesma razão social. Isso evita repetir o bootstrap por engano.

Depois, acesse `/login` com o e-mail e a senha definidos em `ONEIT_INITIAL_ADMIN_PASSWORD`, altere essa senha no primeiro acesso e provisione os demais usuários por `Configurações → Usuários`.

## Atenção operacional

Se a criação da identidade for bem-sucedida mas a criação da organização falhar, não repita o script automaticamente. Investigue o erro e remova ou recupere a identidade pelo console administrativo do Supabase antes de tentar novamente.
