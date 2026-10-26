# Worker de outbox

O endpoint interno `POST /api/internal/outbox` processa até 20 eventos por execução. Ele exige o cabeçalho `Authorization: Bearer <OUTBOX_WORKER_SECRET>` e uma `SUPABASE_SERVICE_ROLE_KEY` exclusivamente no ambiente de servidor.

## Garantias atuais

- O banco reivindica eventos com `FOR UPDATE SKIP LOCKED`; duas execuções não processam o mesmo evento simultaneamente.
- A reivindicação possui lease de 300 segundos. Um evento abandonado volta a ser elegível quando o lease vence.
- Cada tentativa é registrada; falhas transitórias usam atraso exponencial limitado a uma hora e encerram após oito tentativas.
- Somente `OUTBOX_HEALTHCHECK` está registrado nesta primeira entrega. Qualquer tipo desconhecido é marcado como falha não recuperável. E-mail, webhook e integrações não foram habilitados.

## Agendamento

Agende uma chamada autenticada a cada minuto em um scheduler externo ou da infraestrutura de produção. O endpoint não deve ser exposto em links, navegadores ou clientes autenticados. Rotacione o segredo e monitore respostas `503` e eventos com status `FAILED`.

## Antes de produção

1. Aplicar as migrations de outbox e worker em Supabase de desenvolvimento.
2. Configurar `SUPABASE_SERVICE_ROLE_KEY` e `OUTBOX_WORKER_SECRET` apenas no servidor.
3. Testar concorrência, lease expirado, resposta perdida e os oito limites de tentativa.
4. Registrar um handler idempotente e testes específicos antes de produzir qualquer novo `event_type`.

As migrations e testes locais validam o contrato de código, não substituem essa homologação em um banco Supabase real.
