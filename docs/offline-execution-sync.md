# Sincronização manual de execução — 05/10/2026

## Implementado no código

Campo e a tela independente oferecem **Sincronizar rascunho salvo**. O envio usa somente a cópia já persistida e decifrada com a senha original; campos não salvos não são enviados. A confirmação explica esse limite e o encaminhamento OUT_OF_SCOPE para falhas fora de cabeamento. Não há autosave, conclusão técnica offline ou envio automático. Rascunhos parciais continuam permitidos, mas diagnóstico e solução precisam de 10–10.000 caracteres e respostas exatas para sincronizar.

A revisão UUID da cópia salva é a chave da ação. Tentativas da mesma cópia mantêm chave e conteúdo, inclusive após timeout de 20 segundos ou perda de resposta. Editar o rascunho cria uma nova revisão: não fazer isso apenas para repetir um envio incerto, pois seria uma nova ação. O cliente só aceita recibo com a chave esperada e UUID de registro válido. Falha de rede/servidor preserva dados; autenticação expirada pede login online na mesma conta; conflitos não recebem retry automático.

POST /api/executions exige Origin da própria aplicação, JSON até 384 KiB, sessão autenticada e conta do payload igual à sessão. Respostas não são cacheadas. A senha local não é enviada e não substitui autenticação. Limite de corpo é aplicado durante leitura do stream, não só pelo header Content-Length. Não há rate limiting neste incremento.

As duas APIs de sincronização agora comparam Origin com a autoridade Host recebida e o protocolo da requisição, pois o Next pode normalizar o hostname interno para localhost. Não aceitam x-forwarded-host como lista de origens autorizadas. O deploy precisa preservar Host público e encaminhar o protocolo corretamente por infraestrutura confiável; homologar HTTPS/reverse proxy antes de produção.

## Contrato transacional proposto pela migration

20261001180000_execution_sync.sql adiciona recibos por ator/chave com leitura RLS pelo próprio ator. O procedimento SECURITY DEFINER exige perfil ativo, bloqueia a chave da ação e a OS; para nova ação valida técnico ativo atribuído, papel, versão e etapa WORK_STARTED/IN_PROGRESS. Checklist é materializado em uma única consulta (template da organização, fallback global) e comparado com códigos, rótulos e obrigatoriedade enviados. Divergência reverte a transação. Ordem dos itens não altera a comparação.

Registro da execução, transição existente, recibo e auditorias EXECUTION_RECORDED/EXECUTION_SYNCED ocorrem na mesma transação. Repetição de recibo conhecido com conteúdo igual retorna o mesmo registro antes de verificar versão/etapa atuais; chave reutilizada com conteúdo diferente é rejeitada. Esse retorno ainda exige ator autenticado com perfil ativo, mas não exige a atribuição antiga: confirma uma ação daquele ator já registrada, sem criar nova execução. Contas diferentes têm namespaces distintos.

Essas são garantias pretendidas pelo SQL, ainda não comprovadas em Postgres/Supabase. As migrations não foram aplicadas nesta entrega.

## Preservação e limites

Após recibo válido, rascunho permanece cifrado com indicação local do registro confirmado. A indicação é informativa, não uma autorização nem substituto do recibo do servidor. Marcação compara revisão em transação IndexedDB; não marca uma revisão recém-editada nem recria uma cópia removida. Falha ao marcar armazenamento local não apaga a confirmação recebida. Reabrir uma cópia marcada não reaplica campos; é possível repetir o envio para conferir o recibo.

Agenda da conta é invalidada após confirmação para evitar reutilizar versões antigas. A tela independente bloqueia e exige preparar nova agenda online. Se invalidação falhar, informa a necessidade de atualização; rascunhos e outros check-ins são preservados. Enviar nessa tela pode perder campos não salvos de outras OS, por isso há confirmação explícita. Nenhum rascunho é excluído automaticamente.

O botão tradicional **Salvar execução** segue o fluxo online anterior e não recebe a garantia de idempotência deste novo caminho. Restaurar um rascunho no formulário e salvar tradicionalmente é distinto de sincronizar a cópia salva. Não misturar os dois para repetir um envio sem confirmação.

Em 05/10/2026, a agenda local passou a listar cópias de execução da própria conta, inclusive de OS que já não constam na agenda atual. Número e título novos ficam dentro do ciphertext; cópias antigas exibem somente identificador parcial. Cada cópia pode ser sincronizada manualmente ou removida com confirmação. O inventário processa no máximo 100 cópias por abertura; cópias com senha diferente ou inválidas permanecem intactas e são informadas, nunca apagadas.

Ainda pendentes: recuperação sem uma agenda local desbloqueável, materiais/fotos offline, encadeamento de eventos, retenção/logout, limite de armazenamento e homologação móvel. Sprint 9 permanece parcial. Integrações externas permanecem para o final.

## Validação e roteiro de homologação

107 testes locais passaram, incluindo inventário isolado por conta, senha incorreta sem exclusão, payload estável após perda de resposta, rejeição de rascunho parcial, conflitos/autenticação, recibo incorreto, falha de marcação, revisão concorrente/removida e origem legítima/externa/malformada. Lint e TypeScript passaram. Esses testes usam mocks HTTP e IndexedDB em Node; não comprovam RLS, concorrência ou autorização no banco.

Verificação HTTP do build passou tanto por localhost quanto por 127.0.0.1: manifest, dimensões PNG, HTML/bundle público, headers do worker e rejeições de origem externa/JSON/tamanho nas duas APIs. Servidor temporário restrito a loopback foi encerrado. Não foi testado o envio autenticado real no navegador ou no banco.

Antes de piloto, aplicar migrations num Supabase de desenvolvimento e testar: duas requisições simultâneas da mesma ação; commit seguido de resposta perdida; chave igual com payload diferente; conta trocada; perfil desativado; atribuição/versão/etapa alteradas; template alterado; rollback sem execução/recibo parcial; respostas do checklist inválidas via RPC direto; leitura de recibos de outra conta. Validar também browser móvel, aba oculta durante envio, bloqueio/expiração, quota, troca de senha, abas concorrentes e atualização do worker. Não usar produção para esses testes.
