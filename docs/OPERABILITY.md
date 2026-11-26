# Observabilidade e continuidade OneIT

## Sinais disponíveis

- `/api/health`: liveness simples, sem consultar dependências.
- `/api/ready`: readiness de ambiente; `?storage=1` valida Storage privado.
- `/api/version`: versão/deployment publicado.
- `x-request-id`: propagado pelo proxy e retornado nas respostas.
- Worker de outbox: contagem de processados/falhas e retentativa persistida.
- Saúde de e-mails financeiros: fila, enviados, falhos, bloqueados e vencidos.

## Logs

Eventos críticos do worker usam JSON estruturado com timestamp e evento. Chaves que possam conter token, segredo, senha, autorização ou assinatura/data URL são removidas antes do log.

## Continuidade

- Reprocessamento usa chaves de idempotência no outbox e bloqueio transacional no banco.
- Falhas transitórias usam backoff limitado; falhas não suportadas não são repetidas automaticamente.
- Rollback de aplicação: promover o deployment anterior no Vercel.
- Rollback de banco: somente migration incremental reversível e validada; não executar `DROP` em produção.
- Backup e restauração devem ser realizados pelo projeto Supabase em ambiente isolado antes de qualquer operação destrutiva.

## Pendências operacionais

- Não há restauração de backup executada nesta sessão; não declarar RPO/RTO medidos.
- Alertas externos dependem de configuração autorizada do provedor de observabilidade.
