# Implantação em VPS

## Arquitetura recomendada

- VPS: aplicação OneIT em container Docker, não exposta diretamente à internet.
- Proxy reverso: o Caddy incluído no `compose.vps.yml` faz TLS automático, redirecionamento HTTPS e encaminha ao container interno.
- Dados e Auth: projeto Supabase separado (preferencialmente gerenciado; auto-hospedagem do Supabase requer operação adicional de Postgres, Storage, Auth, backups e monitoramento).
- Backups: rotina do banco, teste periódico de restauração e cópia externa criptografada.

## Arquivos incluídos

- `Dockerfile`: build multiestágio e imagem de execução sem root.
- `compose.vps.yml`: aplicação interna e proxy HTTPS público gerenciados em conjunto.
- `deploy/Caddyfile`: proxy reverso HTTPS e cabeçalhos básicos de segurança.
- `.env.production`: arquivo local na VPS, nunca versionado.

## Variáveis obrigatórias

Copie `.env.example` para `.env.production` e preencha:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` somente se houver rota server-side que realmente a utilize.
- `ONEIT_DOMAIN`, com o domínio público apontando por DNS para a VPS.

As duas variáveis `NEXT_PUBLIC_*` participam do build da imagem. Após alterá-las, reconstrua o container.

## Publicação

1. Aponte o DNS do domínio para a VPS; o Caddy solicita o certificado HTTPS automaticamente.
2. Aplique as migrations no ambiente Supabase de staging e execute testes de aceitação.
3. Faça backup validado antes da produção.
4. Na VPS, execute `./deploy/preflight.sh` em um checkout limpo da revisão aprovada; depois execute `docker compose --env-file .env.production -f compose.vps.yml up -d --build`.
5. Verifique `/api/health`, `/api/ready`, login, criação de chamado, ativo e permissão antes de liberar usuários.

## Regras operacionais

- Não exponha Postgres, chaves de serviço ou a porta 3000 diretamente à internet.
- Use projetos Supabase distintos para desenvolvimento, homologação e produção.
- Aplique migrations primeiro em homologação; produção exige janela de mudança, backup e plano de reversão.
- Restrinja SSH, mantenha atualizações de segurança e registre acessos administrativos.
