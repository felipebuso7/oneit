# Plano de melhoria — operação compartilhada de Field Service

## Progresso de implementação

- **Sprint A0 — base implementada no código:** migration de vínculo técnico/localidade e APIs administrativas preparadas para receber os identificadores operacionais.
- **Sprint A — base implementada no código:** migration e API de despacho transacional criadas, incluindo proteção contra sobreposição de agenda. A tela de despacho já chama essa API quando recebe chamado persistido e vínculos operacionais válidos.
- **Sprint B — acesso seguro implementado no código:** o WhatsApp aponta para uma etapa de validação; token e código temporário são enviados separadamente antes de abrir o portal técnico.
- **Sprint C — evidências e aceite implementados no código:** fotos do parceiro são enviadas ao storage privado e o portal exige relatório, ao menos uma evidência e assinatura em canvas confirmada antes do checkout. O evento persiste metadados da foto, nome e imagem do aceite; não envia foto em base64 para o banco. A mesma regra está agora no banco para bloquear chamadas diretas que tentem encerrar a OS sem submissão válida.
- **Sprint C — deslocamento implementado no código:** o portal conduz o técnico por saída para atendimento, chegada/check-in, execução e checkout. O banco registra `TRAVELING` e rejeita check-in sem deslocamento iniciado.
- **Pendente para homologação:** aplicar as migrations em uma base Supabase de homologação e conectar a tela de despacho aos identificadores persistidos. Sem isso, a tela continua no modo demonstrativo local.

## Contexto confirmado

- O banco já possui as entidades de ordem de serviço, rota, parada de rota, eventos, evidências, materiais, revisão e relatório.
- Há uma máquina de estados de OS no banco: `TRIAGE → DISPATCHED → TRAVELING → CHECKED_IN → IN_SERVICE → COMPLETED → VALIDATED`.
- Há acesso externo seguro para técnicos parceiros: token temporário, código de seis dígitos, limite de tentativas, expiração e revogação do link anterior.
- A interface de despacho criada até aqui ainda usa `localStorage` como modo demonstrativo em parte do fluxo. Portanto, não é uma fonte compartilhada entre o computador do gestor e o celular do técnico.

## Objetivo da melhoria

Substituir o ciclo demonstrativo por um ciclo único e persistido no servidor, sem alterar a regra de negócio:

1. Chamado aberto.
2. Gestor agenda e atribui uma visita.
3. OS e rota são persistidas no servidor.
4. Gestor gera link seguro e envia pelo WhatsApp.
5. Técnico registra deslocamento, check-in, execução, materiais, fotos, assinatura e check-out.
6. OS entra em validação do gestor.
7. Gestor confere evidências, aplica LPU, gera RTO e fecha OS/chamado de forma consistente.

## Sprint A0 — Convergência de cadastros (pré-requisito)

### Problema confirmado

- A interface administrativa mais recente grava técnicos em `field_service_technicians`, porém `service_orders.technician_id` referencia `technicians`.
- A interface de despacho trabalha com empresa/polo; já a OS persistida exige `customer_locations`.

Sem uma ponte explícita, a tela pode aparentar que despachou a OS, enquanto o banco não consegue vincular o técnico ou a localidade exigida. Criar cópias silenciosas dos dados não é recomendado, porque geraria divergência de cadastros.

### Entregas

- Definir uma fonte oficial para técnicos e polos/localidades. Recomendação: manter os cadastros administrativos novos e criar chaves de vínculo explícitas para as entidades operacionais legadas durante a transição.
- Criar migração de mapeamento com unicidade por organização e validação de ativo/inativo.
- Criar rotina controlada de migração dos técnicos e polos existentes, com relatório de exceções em vez de criação automática invisível.
- Adaptar a API de despacho para aceitar somente identificadores persistidos, nunca nome de técnico ou texto de polo.

### Critérios de aceite

- Cada técnico disponível no despacho resolve para exatamente um técnico operacional elegível.
- Cada polo selecionado resolve para exatamente uma localidade operacional válida.
- Cadastros desativados não aparecem para novo despacho e não invalidam o histórico existente.
- A tela informa dados não mapeados antes de permitir confirmação.

## Sprint A — Persistência do despacho

### Entregas

- Criar API autenticada de despacho que receba `ticketId`, técnico, data/hora, janela, local e contato.
- Em uma transação do banco: criar/atualizar a OS, atribuir o técnico, atualizar o chamado e registrar evento/auditoria.
- Consultar conflitos da agenda do técnico diretamente da tabela de paradas de rota, considerando data, janela e OS ainda ativa.
- Retornar `serviceOrderId`, número da OS e o estado persistido para a tela de confirmação.

### Critérios de aceite

- Um gestor autorizado não consegue agendar o mesmo técnico em janelas conflitantes sem decisão explícita de exceção.
- Atualizar a página não perde a OS criada.
- Outra sessão autenticada do gestor enxerga a mesma OS e o mesmo status.
- Falhas não deixam chamado atribuído sem OS, nem OS despachada sem evento de auditoria.

## Sprint B — Link técnico real

### Entregas

- A confirmação de despacho gera o acesso temporário a partir do `serviceOrderId` persistido.
- A mensagem de WhatsApp usa somente o link seguro (`token` + código), não a rota demonstrativa local.
- Técnico interno recebe a mesma tela mobile, sem autenticação administrativa; técnico parceiro usa o portal externo já existente.
- Registrar no histórico a geração, reemissão e revogação do acesso, sem salvar token em logs, banco de frontend ou auditoria em texto aberto.

### Critérios de aceite

- O link funciona em outro dispositivo.
- Reemitir o link invalida imediatamente o anterior.
- Token ou código inválido, expirado ou excedendo tentativas não expõe dados da OS.
- O gestor consegue ver apenas que o link foi emitido, sua validade e se houve acesso; nunca o token após a emissão.

## Sprint C — Execução mobile e evidências

### Entregas

- Enviar eventos de deslocamento, check-in, início, materiais, fotos, assinatura e check-out às APIs persistidas.
- Armazenar fotos em storage privado; persistir apenas metadados e caminhos autorizados.
- Capturar assinatura em canvas, validar nome do responsável e anexar a assinatura ao RTO.
- Tratar conectividade: rascunho offline local, indicador de sincronização e reenvio idempotente.

### Critérios de aceite

- Check-out exige relatório mínimo, aceite, fotos ou justificativa e materiais/LPU quando aplicável.
- Eventos duplicados não alteram indevidamente horários ou valores.
- Fotos e assinatura podem ser visualizadas pelo gestor, mas não ficam públicas por URL permanente.
- A OS concluída sai da fila ativa do técnico e entra em `Pendente validação` para o gestor.

## Sprint D — Validação, RTO e encerramento

### Entregas

- Tela de validação mostra somente a decisão do gestor: resumo, evidências, materiais/LPU, valor e RTO.
- Consolidar materiais e mão de obra por item de LPU, com valor unitário, quantidade, valor total e itens extras justificados.
- Encerramento em transação: validar OS, congelar composição usada no RTO, gerar o relatório e fechar o chamado.
- Persistir identificador/versão do RTO e trilha de auditoria da decisão.

### Critérios de aceite

- Não é possível fechar o chamado com OS pendente, evidência obrigatória ausente ou LPU não aplicada.
- O RTO reproduz exatamente a composição e os dados existentes no momento da validação.
- Se a geração do RTO falhar, OS e chamado permanecem em validação; não há fechamento parcial.
- O encerramento remove a OS da operação ativa e a deixa disponível para o BM da competência correta.

## Sprint E — Observabilidade e liberação

### Entregas

- Painel de saúde do fluxo: OS sem técnico, links expirados, eventos pendentes de sincronização, validações vencidas e falhas de geração de RTO.
- Métricas: tempo até atribuição, deslocamento, atendimento, validação e retrabalho por motivo.
- Testes de integração dos estados e testes ponta a ponta em ambiente de homologação.
- Runbook para operação, reemissão de link, reabertura, contingência de conectividade e suporte ao técnico.

### Critérios de aceite

- Fluxo ponta a ponta executado em dois dispositivos/sessões independentes.
- Transições inválidas retornam erro compreensível e não mudam estado.
- Logs permitem rastrear ator, data/hora e origem de cada ação crítica.
- Aprovação formal do gestor de Field antes de liberar em produção.

## Sequência recomendada

1. Sprint A0 e saneamento dos cadastros.
2. Sprint A e testes de consistência.
3. Sprint B antes de qualquer piloto com técnico em campo.
4. Sprint C em homologação com um técnico interno e um parceiro.
5. Sprint D com validação de RTO e LPU.
6. Sprint E e piloto controlado.

## Gate de qualidade — auditoria de usuário avançado (24/10/2026)

- A suíte do repositório aprovou 51 arquivos e 110 testes, mas ela não substitui teste ponta a ponta em navegador.
- O `localhost:3000` inspecionado visualmente não correspondeu ao checkout atual; a homologação visual deve ser repetida com o servidor iniciado a partir deste projeto.
- O build otimizado ainda não foi aprovado. A publicação em VPS permanece bloqueada até `npm run build` terminar com êxito, migrations aplicadas em homologação e fluxo executado em sessões independentes de gestor e técnico.

## Riscos e decisões pendentes

- **Confirmado:** o fluxo demonstrativo é útil para UI, mas não atende comunicação entre dispositivos.
- **Decisão necessária:** para técnico interno, usar o mesmo link temporário sem login ou exigir autenticação leve por código/OTP. A recomendação inicial é link temporário com código, pois atende o requisito de não exigir login administrativo.
- **Decisão necessária:** definir retenção de fotos e assinaturas, tamanho máximo e LGPD/responsável pelo tratamento de dados.
- **Risco técnico:** fotos em base64 no navegador não devem ir ao banco de dados; o destino de produção deve ser storage privado com URLs assinadas.
