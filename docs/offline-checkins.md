# Fila local de check-ins — 01/10/2026

Evolução posterior: [offline-agenda.md](offline-agenda.md) registra a cópia protegida e a tela independente para reabertura. Os limites abaixo descrevem o primeiro incremento da fila.

## Escopo implementado

Na tela Campo já carregada, deslocamento, chegada e início de atendimento passam primeiro por IndexedDB, online ou offline. Salvamento é confirmado somente após completar a transação local. O formulário pede autorização explícita para guardar identificadores de OS, coordenadas, precisão e justificativa no dispositivo. Não grava título de OS, contatos, fotos ou tokens na fila.

Cada evento contém UUID estável, conta de origem, versão observada da OS e horário do dispositivo. Índice único conta/OS impede dois check-ins ainda não confirmados, inclusive em abas diferentes. Não há avanço otimista da etapa: aguardar confirmação, atualizar OS e só então registrar o próximo evento.

Painel mostra eventos da conta autenticada, estados e erros. Sincronização acontece com a tela Campo aberta, no carregamento, ao reconectar, ao adicionar evento e em verificação a cada 15 segundos. Falhas transitórias usam backoff de 5 segundos até 5 minutos e mantêm a mesma chave/payload. Há tentativa manual após reautenticação. Não há Background Sync, agenda offline reaberta ou encadeamento de várias etapas desconectadas.

## Contrato de servidor

POST /api/field-events exige origem igual à aplicação, JSON limitado a 8 KiB, sessão válida e conta igual à que capturou o evento. A RPC sync_ticket_field_event serializa chave por usuário e grava recibo, evento, transição e auditoria na mesma transação. Retry idêntico devolve o evento já criado, sem nova transição; payload diferente para a mesma chave é conflito.

Para novos eventos, técnico e perfil precisam estar ativos, com papel autorizado, atribuição atual e versão igual à capturada. Gestão vence por conflito explícito: não rebasear versão automaticamente. Estado/atribuição/permissão alterados pausam envio. Evento inválido pausa envio. Sessão expirada requer reautenticação na mesma conta.

O horário do cliente é informativo, não confiável: novos eventos aceitam até 7 dias anteriores e até 5 minutos no futuro. occurred_at e server_received_at permanecem no relógio do servidor; offline_created_at preserva a captura. Recibos de eventos já aceitos não expiram por esse filtro temporal. As funções online anteriores permanecem no banco por compatibilidade; o novo formulário usa exclusivamente a rota idempotente.

Remover da fila exige confirmação e avisa sobre possível envio anterior sem resposta. Não desfaz um evento do servidor. Sucesso validado remove somente o item local confirmado. Uma atualização atrasada de outra aba não ressuscita item removido. Sem criptografia adicional em IndexedDB: separação por conta na interface não protege de acesso ao navegador/dispositivo ou de scripts na mesma origem. Usar dispositivos protegidos; política de retenção e logout com pendências precisa de homologação antes de produção.

## Homologação ainda necessária

Migration 20261001170000_offline_field_events.sql ainda não executada no Supabase. Provar atomicidade, duplicidade concorrente, recibos, RLS, isolamento de organizações e gestão alterando a OS durante queda de conexão. Testar perda da resposta após commit, reabertura do navegador, troca de conta, sessão expirada, armazenamento cheio/evicto e múltiplas abas. Testes com fake-indexeddb e repositório simulado não substituem navegador e Postgres reais.

Não concluir Sprint 9: fotos/evidências, observações, persistência após logout e conflitos desses domínios permanecem pendentes. A agenda, checklist, execução e materiais evoluíram depois deste incremento; consultar os documentos de agenda, execução e materiais.

Referências: [IndexedDB na MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB) e [Route Handlers no Next.js](https://nextjs.org/docs/app/getting-started/route-handlers).

## Dependências

fake-indexeddb foi acrescentado apenas para testes. npm audit reportou 3 entradas moderadas na cadeia de ferramentas Vitest/coverage/mocker, associadas ao advisory GHSA-82fw-gwwq-j7x9, sem correção automática indicada no relatório. A atualização principal do Vitest deve ser validada separadamente; não foi aplicado audit fix --force. Não expor servidor de testes na rede.

## Validação local

59 testes passaram; lint, typecheck e build de produção concluídos. O teste HTTP scripts/pwa-smoke.mjs confirmou os recursos PWA e rejeições de origem externa (403), JSON/dados inválidos (400) e corpo acima de 8 KiB (413) na nova API. Servidor temporário restrito a loopback e encerrado após a verificação. Não foram comprovados envio autenticado, aplicação de migrations nem persistência em navegador real.
