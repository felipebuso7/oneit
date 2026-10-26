# Auditoria do envio de BM e fechamento fiscal na demonstração

Data: 25/10/2026. Escopo: `/demo/field-service/finance`, `/demo/field-service/fiscal` e histórico local.

## Fatos confirmados

- Os botões das telas demonstrativas alteravam somente `oneit.demo.billing-cycle.v1` em `localStorage`. Não chamavam `queue-email`, provedor ou RPC de fechamento.
- Apesar disso, o código gravava `emailSentAt`, `finalEmailSentAt` e `immutableAt` e apresentava mensagens de e-mail disparado e faturamento imutável. Esse registro não constituía prova de envio ou bloqueio.
- Há rotas autenticadas separadas em `/api/field-service/fiscal/queue-email` e `/api/field-service/fiscal/batch/close`, além de um adaptador de e-mail com padrão `DRY_RUN`. A existência dessas rotas não demonstra que o fluxo da tela local as usa nem que haja worker/provedor ativo.

## Correção de baixo risco executada

1. O fluxo local mantém as etapas para ensaio, mas os comandos, status e mensagens dizem **simular**. Nenhuma etapa nova grava horário de e-mail enviado, prazo de contestação contratual ou imutabilidade do servidor.
2. A transição de estados ficou em função pura com bloqueio de saltos e de reabertura após o encerramento da simulação.
3. A tela fiscal e o histórico identificam os registros locais como demonstrativos. Campos antigos de suposto envio permanecem no armazenamento legado, sem serem exibidos como comprovação; não houve exclusão de dados.

Captura após o encerramento: [lote fiscal demonstrativo](evidencias/fiscal-demo-sem-email.png).

## Validação

- Navegador: BM com uma OS e R$ 220 → iniciar fechamento → simular validação → registrar conferência → simular envio do BM → simular encaminhamento fiscal → simular encerramento. A tela exibiu explicitamente que nenhum e-mail foi enviado.
- Testes automatizados: transição completa sem `emailSentAt`, `finalEmailSentAt` ou `immutableAt`; rejeição de salto e de reabertura da simulação.
- `npm run typecheck`, ESLint direcionado e 7 testes direcionados passaram após a última edição.

## Pendente para envio real

Integrar uma tela autenticada à fila de e-mail com destinatário autorizado, PDF/versionamento do BM, chave de idempotência, processamento do worker, retorno do provedor e trilha de erro/reenvio. Encerrar fiscalmente apenas por operação transacional no banco após o estado exigido. Nenhum e-mail real foi disparado neste teste.
