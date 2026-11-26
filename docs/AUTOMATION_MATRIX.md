# Automação e notificações OneIT

## Automatizações disponíveis

| Processo | Mecanismo | Idempotência | Retentativa | Disparo real |
|---|---|---|---|---|
| Lembretes SGSTI | `schedule_sgsti_reminders` + outbox | chave por atividade/tipo/data | worker com backoff até 1h | somente com worker autorizado |
| Evidência SGSTI em atraso | scheduler diário + outbox | chave por solicitação/tipo/data | worker com backoff | somente com worker autorizado |
| Entrega de notificações internas | `deliver_sgsti_notification` | `outbox_event_id` único | falha persistida no outbox | não envia e-mail |
| E-mail financeiro/BM | fila `billing_email_log` | chave de idempotência por documento/versão | controlada pelo provedor/worker | somente após configuração explícita |

## Controles

- O endpoint interno do worker exige `Authorization: Bearer` com comparação em tempo constante.
- Eventos possuem chave de idempotência e não são recriados em reprocessamentos.
- Falhas são registradas e recebem backoff exponencial limitado.
- Testes não disparam mensagens reais; o provedor de e-mail fica inativo sem credencial/configuração explícita.
- Aprovação financeira não é automatizada.

## Pendências operacionais

- O ambiente de produção precisa de um agendador externo autorizado para chamar o worker; não há cron configurado neste repositório.
- Alertas de SLA, novos chamados, RTO pendente e contrato próximo do vencimento ainda não possuem produtores automáticos equivalentes. Devem ser implementados com regras de negócio e destinatários aprovados antes de ativação.
