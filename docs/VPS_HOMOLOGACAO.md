# OneIT — checklist de homologação na VPS

## 1. Pré-requisitos

- Docker Engine e Docker Compose Plugin instalados.
- DNS do domínio apontando para a VPS.
- Arquivo `.env.production` criado fora do Git.
- Segredos com pelo menos 32 caracteres.
- Banco PostgreSQL disponível e com backup antes da migration.

## 2. Configuração

Preencher, no mínimo:

- `ONEIT_DEPLOYMENT_MODE=self_hosted`
- `ONEIT_DATABASE_URL`
- `ONEIT_MIGRATION_DATABASE_URL`
- `ONEIT_AUTH_ISSUER`
- `ONEIT_AUTH_CLIENT_ID`
- `ONEIT_APP_URL`
- `ONEIT_SESSION_SECRET`
- `ONEIT_S3_ENDPOINT`
- `ONEIT_S3_BUCKET`
- `ONEIT_BILLING_WORKER_SECRET`

Para envio real de e-mail, configurar também `ONEIT_BILLING_EMAIL_MODE=RESEND`, `RESEND_API_KEY` e `ONEIT_BILLING_FROM_EMAIL`.

## 3. Deploy controlado

```bash
./deploy/preflight.sh
docker compose --env-file .env.production -f compose.vps.yml config
docker compose --env-file .env.production -f compose.vps.yml build --pull
docker compose --env-file .env.production -f compose.vps.yml up -d
docker compose --env-file .env.production -f compose.vps.yml ps
curl -f https://DOMINIO/api/health
curl -f https://DOMINIO/api/ready
```

O preflight bloqueia a publicação quando a árvore Git contém arquivos alterados ou não rastreados. Assim, o commit publicado corresponde ao código conferido. Execute a partir de um checkout limpo da revisão aprovada.
O `--env-file` também é necessário para preencher os argumentos de build `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`; o `env_file` do serviço vale apenas para o ambiente do contêiner.

`/api/health` confirma que o processo responde. `/api/ready` confirma que as variáveis essenciais do modo escolhido estão disponíveis.

## 4. Migrations e smoke test

1. Executar o migrator com a conexão de owner.
2. Confirmar que a aplicação usa a conexão restrita da aplicação.
3. Testar login/logout.
4. Criar chamado.
5. Atribuir visita.
6. Executar check-ins e evidências.
7. Validar RTO.
8. Gerar BM.
9. Enfileirar e-mail.
10. Confirmar o fechamento fiscal imutável.

## 5. Rollback

- Preservar a imagem anterior identificada por tag/commit.
- Não executar rollback de banco destrutivo automaticamente.
- Restaurar o container anterior primeiro.
- Restaurar backup somente após análise da migration incompatível.

## 6. Critério de promoção para produção

- Build concluído.
- Health e readiness verdes.
- Smoke test completo aprovado.
- E-mail real confirmado pelo worker.
- Backup e restauração testados.
- Logs e alertas operacionais ativos.
