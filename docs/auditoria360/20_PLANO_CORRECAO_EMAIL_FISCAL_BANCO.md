# Correção do vínculo entre envio fiscal, lote e BMs

Data: 26/10/2026. **Proposta para homologação; nenhuma migração foi aplicada.**

## Estado confirmado no repositório

- `fiscal_batches.measurement_sheet_ids` é um array de BMs. A fila cria um log fiscal por lote (`fiscal_batch_id`) e deixa `measurement_sheet_id` vazio.
- `transition_measurement_sheet(..., 'CLOSED')` exige um log fiscal `SENT` ligado diretamente a cada BM. Esse requisito não é satisfeito pelo log do lote.
- `close_fiscal_batch` aceita `status = 'SENT'`, porém não consulta `billing_email_log`. Não foi encontrada transição confiável do retorno do provedor para esse status.
- A policy de inserção do log de e-mail verifica papel, mas não impede o envio de `status = 'SENT'` por inserção direta, caso o papel autenticado tenha grant de INSERT. A policy `FOR ALL` do lote permite atualização direta aos papéis financeiros, caso haja grant de UPDATE.

## Modelo recomendado

O e-mail fiscal deve representar **o lote**. O lote guarda a lista de BMs e a versão de cada documento no instante da conferência. Um único log de envio se liga ao lote; cada BM do lote herda a evidência desse envio pela associação imutável lote–BM. A aceitação do provedor é registrada pelo worker, sem afirmar entrega ao destinatário.

### Migração proposta, em ordem

1. Conferir grants e policies reais com `npm run audit:billing-db` em um banco restaurado. Inventariar logs e lotes já existentes; definir tratamento dos registros legados sem apagá-los.
2. Criar uma transição transacional que, após confirmação `SENT` do log fiscal pelo worker, bloqueie o lote, confira organização e BMs associados e marque o lote como `SENT` com `sent_at`. Uma repetição do mesmo resultado deve ser idempotente.
3. Atualizar `transition_measurement_sheet(..., 'CLOSED')` para comprovar o log `SENT` pelo `fiscal_batch_id` de um lote que contém o BM e pertence à mesma organização. Conferir que o lote permanece no estado adequado e que a lista de BMs não mudou depois do envio.
4. Atualizar `close_fiscal_batch` para exigir um log fiscal `SENT` com `provider_message_id` e `sent_at`, verificar que todos os BMs do lote estão na etapa exigida e registrar o fechamento em transação única.
5. Restringir inserção direta de `billing_email_log` e mutações diretas de status em `fiscal_batches`, sem bloquear os RPCs legítimos. A fila autorizada deve ser o único ponto de criação e o worker o único ponto de confirmação do provedor. Testar os papéis `authenticated` e `service_role`.
6. Vincular o PDF versionado e o conteúdo efetivo dos anexos ao log antes do envio. O worker não deve enviar quando os artefatos não corresponderem à versão conferida.

## Cenários de homologação necessários

| Cenário | Resultado exigido |
|---|---|
| Lote com dois BMs, e-mail apenas enfileirado | Nenhum BM nem lote pode fechar. |
| Worker registra falha do provedor | Lote permanece sem comprovação de envio. |
| Worker confirma aceite do provedor | Um log `SENT` fica ligado ao lote; ambos os BMs podem seguir o fluxo autorizado. |
| BM removido/trocado após envio | Mutação recusada; criar nova versão/lote conforme regra definida. |
| Gestor tenta inserir log `SENT` via API de dados | Operação recusada pelo banco. |
| Gestor tenta marcar lote `SENT` diretamente | Operação recusada pelo banco. |
| Dois fechamentos concorrentes | Apenas uma transição efetiva e trilha coerente. |
| Reenvio da mesma versão | Chave de idempotência impede duplicação acidental. |

## Ambiente disponível neste ciclo

Não há `psql`, Docker/Podman, URL de banco ou `.env.local` configurados nesta máquina. A verificação de grants e as transações SQL **não foram executadas**. A migração deverá ser criada somente depois de testar a proposta em cópia restaurada do banco e conferir o histórico de migrations, que já contém um prefixo duplicado.
