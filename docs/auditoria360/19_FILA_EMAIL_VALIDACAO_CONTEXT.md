# Fila autenticada de e-mail: contexto e limites

Data: 26/10/2026. Escopo: `POST /api/field-service/fiscal/queue-email` e regras de BM/lote fiscal.

## Fatos confirmados no código

- A rota usa sessão autenticada e Supabase com RLS. A policy de inserção em `billing_email_log` exige perfil financeiro/gestor da organização; a policy de leitura dos destinatários exige associação à organização. Essas policies **não foram testadas em PostgreSQL real** neste ciclo.
- O endpoint anterior `POST /api/field-service/fiscal/email-log` permitia inserir diretamente um log sem conferir BM/lote, destinatários ou versão. Não foram encontradas chamadas internas a esse POST; clientes externos não foram inventariados.
- A policy de `billing_email_log` verifica o papel da organização, mas não limita `status`, `sent_at` ou `provider_message_id` em uma inserção direta. A policy de `fiscal_batches` permite operações `FOR ALL` ao mesmo conjunto de papéis. Se essas tabelas estiverem expostas aos clientes autenticados, há risco de forjar um estado de envio/fechamento sem passar pelas rotas. Os grants efetivos ainda precisam ser conferidos no banco.
- Antes desta correção, a rota aceitava identificadores de BM/lote e chave de idempotência informados pelo cliente sem verificar se pertenciam à organização e se estavam em etapa elegível.
- O lote fiscal contém `measurement_sheet_ids` (vários BMs possíveis). A rota registra e-mail fiscal com `fiscal_batch_id` e `measurement_sheet_id = null`. Já `transition_measurement_sheet(..., 'CLOSED')` exige um log fiscal `SENT` com `measurement_sheet_id = target_sheet_id`. Essas duas regras não fecham o ciclo; a correção requer decisão de modelagem e teste de migração em banco.
- A transição para `SENT_FOR_CONTESTATION` grava `sent_to_customer_at` antes de exigir confirmação de aceite do e-mail pelo provedor. O horário não comprova envio ao cliente.
- Não foi localizado executor do worker nos diretórios `src`/`scripts`. A fila recebe metadados de anexos, sem vínculo comprovado com o conteúdo binário do PDF.

## Correção segura executada

1. A rota exige o identificador correspondente ao tipo de e-mail, consulta o BM/lote, confere organização e etapa e recusa contexto inválido.
2. Para BM, a chave de idempotência é calculada no servidor por planilha e versão atual. Para fiscal, é calculada por lote. Chave arbitrária enviada pelo navegador é rejeitada.
3. O identificador da versão do BM é guardado no contexto do log. A resposta indica apenas `QUEUED`, sem afirmar envio ou entrega.
4. O POST legado de `/email-log` passou a usar exatamente o handler de `/queue-email`. Campos de status/provedor enviados pelo cliente são rejeitados.
5. A fila fiscal recusa lote sem BMs, com IDs repetidos ou com BM não encontrado na mesma organização.

## Validação executada

- Testes da rota com cliente Supabase simulado: BM de outra organização, lote encerrado ou sem BMs, BM fiscal de outra organização, chave forjada, tentativa de declarar `SENT` e enfileiramento válido com versão e estado `QUEUED`.
- Testes das regras de status/idempotência, rota legada e leitura do log: 12 testes direcionados passaram.
- `npm run typecheck` e ESLint direcionado passaram. Não houve envio real, consulta a banco real nem homologação do worker.

## Bloqueios para produção

1. Definir se o e-mail fiscal é por lote ou por BM e ajustar, de forma transacional, a relação entre log, fechamento e lote. Validar com lote de múltiplos BMs em banco restaurado.
2. Vincular PDF e demais anexos a artefatos persistidos/verificados, implementar executor do worker e testar falhas, retries e aceite do provedor em sandbox.
3. Associar a transição `SENT_FOR_CONTESTATION` a um log de e-mail confirmado, preservando o significado histórico do evento.
4. Homologar RLS, concorrência/idempotência e upgrade das migrations em PostgreSQL real antes de uso produtivo.
5. Em migração nova, restringir o acesso direto às tabelas financeiras e reservar a alteração de `SENT` ao worker com identidade própria. Testar matriz de privilégios de cliente autenticado, gestor e serviço em banco restaurado antes de aplicar em produção.

Até esses itens serem resolvidos, **enfileirar não significa enviar**, e o fluxo financeiro não está pronto para produção.
