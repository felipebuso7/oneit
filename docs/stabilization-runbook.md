# Runbook de estabilização

## Objetivo

Separar disponibilidade do processo de prontidão operacional antes de um deploy.

## Endpoints

- `GET /api/health`: liveness da aplicação. Deve responder `200` enquanto o processo está ativo.
- `GET /api/ready`: readiness da configuração de runtime. Responde `200` somente quando o conjunto mínimo do modo de implantação está presente; caso contrário, responde `503`.

As respostas não retornam nomes de variáveis, URLs, chaves ou credenciais. O endpoint de prontidão deve ser usado pelo balanceador/`readinessProbe`; o endpoint de saúde deve ser usado pelo `livenessProbe`.

## Modos suportados

### Supabase (legado)

Requer `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Self-hosted/VPS

Requer `ONEIT_DATABASE_URL`, `ONEIT_AUTH_ISSUER`, `ONEIT_AUTH_CLIENT_ID`, `ONEIT_S3_ENDPOINT` e `ONEIT_S3_BUCKET`, além dos segredos específicos dos workers e do provedor de e-mail quando esses recursos forem ativados.

## Checklist antes do deploy

1. Executar `npm run lint:stabilization` para os arquivos críticos desta Sprint.
2. Executar `npm run typecheck`.
3. Executar `npm test`.
4. Executar `npm run build` em CI, container ou ambiente de homologação.
5. Consultar `/api/ready` no mesmo ambiente do processo.
6. Confirmar que o proxy não roteia tráfego para uma instância que responda `503`.
7. Validar autenticação, banco, storage, fila/outbox e e-mail em homologação com dados de teste.

O comando `npm run lint` continua sendo uma frente separada de saneamento do legado demonstrativo; ele não deve ser usado como aceite isolado desta Sprint até que os débitos históricos sejam tratados.

O `200` de `/api/ready` confirma apenas a presença da configuração mínima; não prova conectividade, migrações aplicadas ou permissões corretas no provedor externo. Essas verificações continuam obrigatórias na homologação.
