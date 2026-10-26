# Rascunhos de execução e checklist offline

Evolução em 05/10/2026: [offline-execution-sync.md](offline-execution-sync.md) adiciona sincronização manual idempotente da cópia salva. Este documento registra o incremento anterior; a ausência de sincronização citada abaixo não descreve mais o código atual.

## Escopo deste incremento

Agenda protegida agora inclui os itens de checklist da OS: snapshot já existente ou template da organização (fallback global), seguindo a mesma seleção da tela Campo. Cópias antigas sem checklist continuam legíveis, mas precisam ser atualizadas online para obter os itens atuais. Até 100 itens por OS; dados locais cifrados limitados a 1 MB antes da criptografia.

Para OS em WORK_STARTED ou IN_PROGRESS, a tela independente permite diagnóstico, solução/encaminhamento, domínio da falha e respostas de checklist como rascunho. Campos podem estar incompletos: rascunho não é registro confirmado, não altera estado e não satisfaz critérios de conclusão no servidor. Não há autosave nem envio automático. Autorização de armazenamento é explícita; salve antes de ocultar/fechar ou sincronizar check-ins. Alterações ainda não salvas se perdem quando a tela bloqueia.

## Proteção e preservação

Rascunhos ficam em IndexedDB separado, cifrados com o mesmo mecanismo Web Crypto da agenda (AES-GCM, PBKDF2, salt e IV aleatórios). Conta, OS e revisão local são vinculadas ao ciphertext. A senha local é mantida somente na sessão desbloqueada da tela independente, para salvar/reabrir rascunhos, e a referência é removida ao bloquear. Isso não garante apagamento físico da memória nem proteção contra XSS/dispositivo comprometido. A fila de check-ins ainda não recebe essa criptografia.

Um rascunho por conta/OS. Inserção não substitui uma cópia existente. Para editar, reabrir a cópia compatível e confirmar substituição; atualização compara a revisão na mesma transação. Outra aba alterando ou removendo a cópia causa conflito, sem sobrescrever ou ressuscitar dados.

Substituir, expirar, remover ou invalidar a agenda não remove rascunhos. Trocar a senha ao preparar nova agenda não recifra os rascunhos antigos: a senha original continua necessária. Não há recuperação de senha. Exclusão de rascunho na tela Campo é explicitamente confirmada e permanente, sem alterar o servidor. Não limpar rascunhos automaticamente após tentativa de envio.

## Restauração online

Na execução online, informar a senha original e restaurar só preenche o formulário, após confirmação de substituição dos campos atuais. Conta, OS, versão e conteúdo do checklist precisam coincidir. Não atualizar a versão do rascunho automaticamente. Em divergência, importação é bloqueada e a cópia aparece somente para consulta, sem envio. O técnico deverá revisar o contexto com a gestão e registrar dados válidos conscientemente.

Depois da restauração compatível, revisar e usar Salvar execução: o fluxo online existente valida diagnóstico, solução, checklist, versão e permissões. Não há sincronização idempotente de execução neste incremento. O rascunho permanece até exclusão explícita, inclusive após sucesso no servidor. Hoje a recuperação online está no formulário das OS atribuídas em execução; consulta geral de rascunhos de OS fechadas/reassignadas ainda não foi implementada.

## Validação e pendências

Testes locais verificam dados parciais, respostas exatas, senha incorreta, separação de chaves por conta/OS, preservação, revisão concorrente e compatibilidade de importação. Homologar no navegador móvel e Supabase antes de piloto: reabertura, aba oculta, prazo, quota/evicção, troca de conta, senha anterior, alteração do template e conflito de versão. Não há comprovação de autorização ou transações no Postgres por esses testes.

Sprint 9 permanece parcial: fotos offline, encadeamento de eventos, política de retenção/logout e recuperação sem agenda local continuam pendentes. A execução idempotente, o inventário de rascunhos e a fila de materiais evoluíram depois deste incremento; consultar [offline-execution-sync.md](offline-execution-sync.md) e [materials-evidences.md](materials-evidences.md). Integrações externas permanecem para o final.

Resultado local: 79 testes passaram, lint e typecheck concluídos, build de produção gerou o bundle estático atualizado. Verificação HTTP passou para HTML/bundle com rascunhos, recursos PWA e rejeições básicas da API. Servidor temporário foi restrito a loopback e encerrado após o teste. Não foram validados nesta entrega o formulário autenticado, fluxo móvel real ou migrations no Supabase.
