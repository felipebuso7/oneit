# Sprint Financeira 1 — BM e competência

## Entrega

- Nova tela demonstrativa em `/demo/field-service/finance`.
- Competência mensal selecionável.
- Consolidação somente de OS com estado `Concluído` e data de conclusão na competência.
- Visão macro agrupada por serviço e material.
- Visão micro por OS, chamado, empresa, polo, técnico, conclusão e valor.
- Estados orientados ao ciclo financeiro: rascunho, revisão, contestação, aprovação, fiscal e encerramento.
- Exportação do detalhamento micro em CSV para conferência.
- Persistência local da etapa da competência no modo demonstrativo.

## Persistência preparada

As migrations `20261023100000_billing_measurements.sql` e `20261023103000_billing_measurement_versions.sql` preparam:

- competência e BM;
- linhas micro e resumo macro;
- contestação;
- versões imutáveis com snapshot e hash;
- eventos de auditoria;
- lote fiscal por competência;
- políticas RLS para membros e perfis financeiros.

## Próxima sprint

1. Substituir a fonte local pelo Supabase no fluxo de geração do BM.
2. Criar engine server-side com valores em centavos e arredondamento determinístico.
3. Gerar PDF macro/micro com hash e anexar ao BM.
4. Implementar janela configurável de contestação (padrão de 72 horas).
5. Criar lote fiscal com PDF/XLSX e destinatários configuráveis.
6. Bloquear novas alterações depois do encerramento da competência.

> A tela atual é uma primeira entrega funcional demonstrativa. O fechamento financeiro real só deve ser habilitado depois da aplicação das migrations no ambiente Supabase e da homologação das regras comerciais.

## Sprint Financeira 2 — entrega inicial

- Engine de cálculo em `src/lib/field-service/billing-engine.ts`, isolado da UI.
- Arredondamento determinístico em centavos.
- Linhas de serviço e material, com agrupamento macro e rastreabilidade micro.
- Exportação CSV usando o mesmo resultado do engine.
- Rota `POST /api/demo/field-service/billing-pdf` para gerar PDF horizontal de conferência.
- Botão "Gerar PDF BM" na tela de competência.

O PDF atual é um documento demonstrativo de conferência. Ainda não deve ser enviado ao cliente ou ao fiscal, pois a fonte continua sendo o armazenamento local do modo demo.

## Sprint Financeira 3 — integridade do ciclo

- Migration `20261023110000_billing_state_machine.sql` adiciona a função transacional `transition_measurement_sheet`.
- A função bloqueia o BM durante a mudança, valida a ordem da competência e grava evento de auditoria.
- A sequência aceita é: `DRAFT → READY_FOR_REVIEW → SENT_FOR_CONTESTATION → APPROVED → SENT_TO_TAX → CLOSED`.
- A janela padrão de contestação registrada no banco é de 72 horas.

Essa função deve ser chamada pelo backend autenticado; a tela não deve atualizar diretamente o status financeiro em produção.

## Sprint Financeira 4 — endpoint protegido

- Rota `POST /api/field-service/measurement/transition` criada.
- Valida origem, JSON, payload, sessão autenticada e status permitido.
- Chama a função transacional do banco com o usuário autenticado como ator.
- Normaliza respostas de não encontrado, não autorizado, conflito de estado e indisponibilidade.

## Sprint Financeira 5 — lote fiscal

- Função `create_fiscal_batch` consolida somente BMs aprovados da competência.
- O lote é único por organização e competência (`FISCAL-AAAA-MM`).
- BM não aprovado ou já enviado ao fiscal não entra novamente no lote.
- O envio ao fiscal atualiza os BMs selecionados, a competência e a trilha de eventos.
- Endpoint protegido criado em `POST /api/field-service/fiscal/batch`.

## Sprint Financeira 7 — encerramento fiscal

- Função `close_fiscal_batch` fecha somente lote no estado `SENT`.
- Registra `closed_at`, responsável e eventos `CLOSED` para cada BM vinculado.
- Endpoint protegido criado em `POST /api/field-service/fiscal/batch/close`.
- O encerramento passa a ser uma operação de backend, não apenas uma alteração visual da interface.

## Sprint Financeira 8 — destinatários

- Tabela `billing_recipients` criada com separação entre `MEASUREMENT` e `FISCAL`.
- Validação de e-mail, organização, duplicidade e status ativo.
- Endpoint `GET/POST /api/field-service/fiscal/recipients` criado.
- O provedor de e-mail poderá buscar destinatários sem depender de texto livre na tela.

## Sprint Financeira 9 — evidência de comunicação

- Tabela `billing_email_log` criada para BM e fiscal.
- Registra destinatários, assunto, anexos, provedor, status, identificador externo, erro e horário.
- Endpoint `POST /api/field-service/fiscal/email-log` criado.
- O registro permite homologar SMTP/Resend depois sem perder a rastreabilidade das tentativas.

## Sprint Financeira 10 — provedor e qualidade

- Contrato `sendBillingEmail` criado em `src/lib/field-service/billing-email-provider.ts`.
- Modo padrão `DRY_RUN`, evitando envio real sem configuração explícita.
- Modos reservados para `SMTP` e `RESEND`, sem credenciais expostas à UI.
- Teste do engine criado em `tests/billing-engine.test.ts`.

Observação: a configuração atual do Vitest deste repositório não inclui a pasta `tests/`; por isso o teste precisa ser incorporado à configuração de CI antes de ser tratado como evidência automatizada.

O adaptador Resend foi implementado com ativação explícita por `ONEIT_BILLING_EMAIL_MODE=RESEND`, `RESEND_API_KEY` e `ONEIT_BILLING_FROM_EMAIL`. Sem essas variáveis, o comportamento permanece `DRY_RUN`/fila, sem disparo externo.

## Sprint Financeira 11 — fila segura de comunicação

- Endpoint `POST /api/field-service/fiscal/queue-email` criado.
- Só aceita destinatários previamente cadastrados e ativos para o tipo de comunicação.
- Apenas cria uma mensagem `QUEUED` no `billing_email_log`.
- O disparo externo deverá ser executado por worker autorizado, reduzindo risco de exfiltração de anexos financeiros.

## Sprint Financeira 12 — preparação do worker

- `billing_email_log` recebeu `attempt_count`, `locked_at` e `next_attempt_at`.
- Índice de fila criado para mensagens pendentes e retentativas.
- A função de claim ainda não foi criada: depende da definição de identidade/allowlist do worker para não ampliar o acesso por `SECURITY DEFINER`.

## Sprint Financeira 13 — claim interno

- Claim transacional com `FOR UPDATE SKIP LOCKED` implementado.
- Mensagens presas há mais de 15 minutos podem ser recuperadas.
- Rota interna `POST /api/internal/billing-email/claim` criada.
- A rota exige `x-oneit-worker-secret` e usa o cliente `service_role` já adotado pelos workers internos.
- O segredo deve ser configurado em `ONEIT_BILLING_WORKER_SECRET` e nunca exposto ao navegador.

## Sprint Financeira 14 — resultado do worker

- Funções `complete_billing_email` e `fail_billing_email` criadas.
- Sucesso registra `SENT`, horário e identificador do provedor.
- Falha agenda retentativa com backoff; após cinco tentativas passa a `FAILED`.
- Rota interna `POST /api/internal/billing-email/result` criada.
- A rota exige o mesmo segredo interno e não é acessível pela interface pública.

## Sprint Financeira 15 — observabilidade

- Rota interna `GET /api/internal/billing-email/health` criada.
- Retorna contagens de fila, enviadas, falhas, bloqueios e mensagens vencidas.
- Nenhum destinatário, assunto ou conteúdo de anexo é exposto.
- A rota usa o mesmo segredo do worker e está pronta para monitoramento operacional.

## Sprint Financeira 16 — imutabilidade fiscal

- Trigger `fiscal_batch_immutability` criado.
- Lote `CLOSED` não pode ter valor, competência, status ou BMs vinculados alterados.
- Tentativas de alteração geram `closed_fiscal_batch_immutable`.

## Sprint Financeira 17 — histórico

- Tela `/demo/field-service/fiscal/history` criada.
- Consulta competências, lotes, quantidade de OS, valor, status e última atualização.
- Filtro por competência.
- A visão é somente leitura; o histórico produtivo será carregado do Supabase.

## Sprint Financeira 18 — consulta produtiva

- Endpoint autenticado `GET /api/field-service/fiscal/history` criado.
- Consulta competências e lotes fiscais da organização.
- Limite inicial de 36 competências/lotes para evitar consultas sem paginação.
- A resposta não expõe dados de destinatários ou conteúdo de anexos.

## Sprint Financeira 19 — auditoria financeira

- Endpoint autenticado `GET /api/field-service/fiscal/audit` criado.
- Consulta eventos por BM ou organização.
- Retorna tipo de evento, ator, versão, metadados e data.
- Limite de 200 eventos por consulta para preservar desempenho.

## Sprint Financeira 20 — versões do BM

- Endpoint autenticado `GET /api/field-service/fiscal/versions` criado.
- Consulta versões por BM, da mais recente à mais antiga.
- Retorna hash de cálculo, snapshot, origem, status, valores e datas.
- Preserva o histórico após contestação e recálculo.

## Sprint Financeira 21 — contestação

- Endpoint autenticado `POST /api/field-service/fiscal/contestation` criado.
- Valida organização, competência, estado e prazo de 72 horas.
- Impede contestação duplicada para o mesmo BM.
- Registra a contestação com responsável, prazo e justificativa.

## Sprint Financeira 22 — resolução da contestação

- Endpoint autenticado `POST /api/field-service/fiscal/contestation/resolve` criado.
- Aceita decisão `ACCEPTED` ou `REJECTED`.
- Registra parecer, responsável e data de resolução.
- Contestação aceita mantém a competência em `CONTESTED` para recálculo.
- Contestação rejeitada devolve a competência ao estado `APPROVED`.

## Sprint Financeira 23 — recálculo versionado

- Função `recalculate_measurement_sheet` criada.
- Versão anterior é marcada como `SUPERSEDED`, nunca apagada.
- Novo snapshot, hash e total são registrados.
- O BM retorna a `READY_FOR_REVIEW` após recálculo.
- Endpoint autenticado `POST /api/field-service/fiscal/recalculate` criado.

## Sprint Financeira 24 — guarda de aprovação

- Trigger `billing_period_open_contestation_guard` criado.
- Competência com contestação `OPEN` não pode ser aprovada.
- A regra é aplicada no banco, independentemente da interface ou da API usada.

## Sprint Financeira 25 — painel de contestações

- Endpoint autenticado `GET /api/field-service/fiscal/contestations` criado.
- Consulta por competência ou organização.
- Retorna prazo, status, justificativa, responsável e resolução.
- Limite de 200 registros por consulta.

## Sprint Financeira 26 — detalhe do lote fiscal

- Endpoint autenticado `GET /api/field-service/fiscal/batch/:id` criado.
- Retorna lote, BMs vinculados e linhas micro por OS.
- Permite conferência do macro e micro antes do envio ou encerramento.
- Mantém os dados em modo somente leitura.

## Sprint Financeira 27 — exportação produtiva

- Endpoint autenticado `GET /api/field-service/fiscal/batch/:id/csv` criado.
- Exporta as linhas micro persistidas no lote fiscal.
- Inclui competência, lote, OS, LPU, quantidade, preço unitário e total.
- Usa UTF-8 com BOM e separador compatível com planilhas brasileiras.

## Sprint Financeira 28 — PDF produtivo

- Endpoint autenticado `GET /api/field-service/fiscal/batch/:id/pdf` criado.
- PDF com capa do lote, competência, status e valor total.
- Segunda seção com detalhamento micro por OS, LPU, quantidade e total.
- Paginação automática para grandes lotes.

## Sprint Financeira 29 — contexto da OS

- Linhas do BM agora suportam data de execução.
- Local/polo do atendimento.
- Referência externa da OS.
- Índice para consultas por competência, data e local.

## Sprint Financeira 30 — padrão BM Cabling

- Endpoint vertical separado: `GET /api/field-service/fiscal/batch/:id/cabling-pdf`.
- A primeira página segue o padrão visual do BM de locação anexado.
- O detalhamento identifica LPU e EXTRA individualmente.
- O modelo antigo permanece disponível para comparação durante a homologação.
- A substituição definitiva deve ocorrer após validação visual e conferência de valores com um BM real.

## Sprint Financeira 31 — exportação contextual

- CSV e detalhe do lote passam a expor tipo de linha, data, local e referência do extra.
- O consumo de dados fica alinhado ao layout final de Cabling.

## Sprint Financeira 32 — prontidão do BM

- Validador reutilizável criado em `src/lib/field-service/billing-readiness.ts`.
- Verifica OS/chamado, descrição, quantidade, preço, data de execução e local/polo.
- Permite bloquear a emissão de um BM incompleto antes da geração do documento.

O endpoint `cabling-pdf` agora aplica essa validação e retorna `BILLING_DOCUMENT_INCOMPLETE` com os campos pendentes antes de gerar o PDF.

O CSV produtivo também aplica a mesma validação e retorna `BILLING_EXPORT_INCOMPLETE`, evitando divergência entre os arquivos de conferência e o documento oficial.

## Sprint Financeira 35 — prontidão do lote

- Endpoint autenticado `GET /api/field-service/fiscal/batch/:id/readiness` criado.
- Retorna `ready`, quantidade de linhas e pendências por OS.
- Permite corrigir o BM antes de iniciar a geração de documentos.

## Sprint Financeira 36 — resumo macro produtivo

- Endpoint autenticado `GET /api/field-service/fiscal/batch/:id/summary` criado.
- Agrupa por LPU/tipo de linha.
- Retorna quantidade e total arredondados no backend.
- Pronto para alimentar a capa do BM e indicadores financeiros.

## Sprint Financeira 37 — resumo micro por OS

- Endpoint autenticado `GET /api/field-service/fiscal/batch/:id/orders` criado.
- Agrupa as linhas do BM por OS/chamado, preservando data, local/polo e referência externa.
- Retorna composição item a item (LPU, EXTRA, desconto ou ajuste), quantidade, preço unitário e total da linha.
- Calcula o total de cada OS no backend, com arredondamento de duas casas.
- A resposta atende à segunda parte do BM Cabling: macro consolidado na capa e micro detalhado por OS nas páginas seguintes.
- Lotes sem BM vinculado retornam uma coleção vazia de forma explícita, sem consulta inválida.
- Linhas sem número de OS ou com total não numérico são ignoradas/protegidas para não contaminar o consolidado.
- A resposta também retorna controles de conferência: quantidade de OS, quantidade de linhas, total de extras e total geral do lote.

O resumo macro (`/summary`) foi alinhado ao mesmo contrato: retorna total geral e total de extras, além de tratar lotes sem BMs vinculados sem executar consulta inválida.

## Sprint Financeira 38 — reconciliação macro x micro

- Endpoint autenticado `GET /api/field-service/fiscal/batch/:id/reconciliation` criado.
- Compara o `total_amount` do lote fiscal com a soma das linhas micro.
- Retorna diferença arredondada, quantidade de OS, quantidade de linhas e indicador `consistent`.
- Lotes sem BM vinculado são tratados explicitamente.
- Essa conferência deve ser executada antes da aprovação ou envio ao fiscal.
