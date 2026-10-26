# Field Service — diagnóstico e proposta da central de despacho

Data: 25/10/2026. Escopo: leitura do repositório; proposta para aprovação, sem alteração da aplicação ou dos dados.

## Limites da auditoria

Os achados abaixo descrevem código e migrations existentes, não comprovam quais migrations estão aplicadas em um banco específico. Não foi executado nesta auditoria um fluxo ponta a ponta no navegador, teste em celular, WhatsApp, banco real, concorrência, geolocalização ou entrega de mensagem. O sintoma relatado de WhatsApp não foi reproduzido: as causas abaixo são riscos concretos no código, não um diagnóstico definitivo do aparelho do usuário. As rotas demonstrativas e as do portal persistente precisam ser identificadas no ambiente utilizado antes de qualquer conclusão sobre produção.

## 1. Mapa do fluxo e evidências

| Etapa | Implementação encontrada | Situação e limites |
|---|---|---|
| Abertura e fila | `src/app/demo/tickets/page.tsx`; portal em `src/app/(portal)/portal/tickets/` | Existem caminhos demonstrativo e persistente. Não foi confirmado nesta auditoria o fluxo de criação no catálogo até o banco. |
| Encaminhar, escolher técnico e horário | `src/app/demo/field-service/dispatch/page.tsx`; `src/app/api/field-service/dispatch/route.ts`; migration `20261024131000_atomic_field_dispatch.sql` | Há despacho persistente para registros com IDs compatíveis e caminho demonstrativo em armazenamento local. A operação persistente cria OS, rota e parada e atualiza o chamado; conferir migration aplicada. |
| Agenda e conflito | tela de despacho e migration de despacho atômico | A tela demonstrativa compara janela textual, dia e nome; sobreposições com textos diferentes podem passar. O banco compara intervalos e usa bloqueios; jornadas, competência e deslocamento não aparecem nessa validação. Não foi testada concorrência. |
| Outro caminho de despacho | `src/app/(portal)/portal/service-orders/actions.ts` | Chama outra função de despacho. Os caminhos não têm as mesmas garantias aparentes de criação de rota e conflito. Unificação requer análise de dependências e migração compatível. |
| Comunicação | `src/app/demo/field-service/dispatch/confirmed/page.tsx`; `src/app/demo/field-service/page.tsx` | Há mais de uma implementação de abertura do WhatsApp. Preparar uma mensagem não comprova envio ou entrega. |
| Acesso do técnico | `src/app/demo/field-service/partner/access/page.tsx`; APIs `src/app/api/field-service/partner/` | Existe acesso de parceiro com token e código e rotas para contexto, eventos e upload. A alternativa demonstrativa depende de dados locais do navegador. Segurança efetiva e expiração precisam de teste em ambiente real. |
| Aceite, deslocamento, chegada, execução e checkout | `src/components/field-service/partner-execution-flow.tsx`; migration `20261024133000_partner_submission_completion_guard.sql` | O fluxo persistente registra eventos e exige relato, evidência e assinatura no envio. Existe também tela demonstrativa `src/app/demo/field-service/technician/page.tsx`, com capacidades e persistência diferentes. |
| Assinatura | componente de execução do parceiro e API de eventos | Confirmar assinatura atualiza estado da interface; a gravação no backend acontece na submissão posterior. Não foi constatado bloqueio permanente dos campos no instante da confirmação. Recarregar antes do envio pode perder alterações. |
| Retorno para validação | `src/app/demo/field-service/validation/`, `validation-v2/`; `src/app/(portal)/portal/review/`; migrations de conclusão e parceiro | As filas demo leem `localStorage`. A fila persistente consulta o status administrativo `AWAITING_REVIEW` e registros de conclusão. Na função de checkout do parceiro inspecionada, a OS é concluída, mas não há atualização explícita do chamado para `AWAITING_REVIEW` nem criação de `ticket_completions`. Não foi identificada ponte automática nas migrations pesquisadas; validar em banco para confirmar o impacto. |
| Aprovar ou devolver | migration `20261001130000_completion_review.sql`; portal `review` | A função de revisão exige conclusão e versão, verifica perfil e impede autoaprovação. Aprovação muda para `APPROVED`, não é por si só evidência de fechamento definitivo ou geração de RTO. Devolução registra decisão e motivo; revisão de conteúdo assinado precisa de desenho adicional. |
| Mapa e rota | `src/app/demo/field-service/routes/page.tsx`; tela mobile demonstrativa | Há ordem manual e links externos de navegação. Não foi encontrada, nos caminhos examinados, integração que forneça posições reais, rotas calculadas e ETA para a central. Distância de polo à capital não é distância do técnico ao chamado. |

### Entidades e estados existentes

Principais estruturas identificadas: `tickets`, `technicians`, `service_orders`, rotas e paradas, acessos e submissões de parceiro, `ticket_execution_records`, `ticket_field_events`, `ticket_evidences`, `ticket_materials`, `ticket_completions`, `ticket_reviews` e `audit_logs`. Ver schemas e políticas nas migrations antes de reutilizá-las; esta lista não afirma que todas estejam integradas.

O chamado já separa `operational_status` de `administrative_status` (`20260930130000_tickets_foundation.sql`); há status próprio da OS e status próprio de agendamento (`20261001330000_service_orders_foundation.sql`, `20260930132000_scheduling.sql`). A disponibilidade do técnico tem enum próprio (`20260930121000_foundation.sql`). Preservar essa separação e evitar apresentar nomes diferentes como se fossem um único estado persistido.

## 2. Fragilidades e causa provável

1. **Fluxos paralelos e fontes diferentes.** `localStorage` alimenta telas demo, enquanto o portal usa banco. Inferência: o gestor pode enxergar dados diferentes conforme a rota ou navegador; confirmar no ambiente usado.
2. **Possível quebra de passagem para validação.** Checkout do parceiro e `complete_ticket` operam em estruturas e estados distintos. A fila de revisão depende de conclusão que não aparece explicitamente no checkout examinado. Impacto potencial: técnico encerra, mas gestor não encontra o trabalho.
3. **Despacho sem decisão de disponibilidade completa.** A detecção demonstrativa usa igualdade de texto; a função atômica é mais forte, mas não comprova jornada, deslocamento nem qualificação. Não exibir distância ou disponibilidade definitiva sem dados.
4. **WhatsApp: mais de uma fonte de erro possível.** A tela de confirmação constrói URL com telefone e mensagem codificados, mas registra mensagem preparada antes de verificar a abertura; não há confirmação de entrega. O link alternativo pode apontar para `localhost` e dados locais, inviável em outro celular. O fluxo seguro depende de gerar acesso; a página pede código, enquanto a mensagem examinada não o destaca separadamente. Um código incluído na URL não é garantia de que o formulário o aceite. Não expor token e código juntos em URL ou logs sem avaliação de segurança. Validar telefone, bloqueio de pop-up, URL pública e processo real em dispositivo.
5. **Assinatura não sela os dados imediatamente.** A confirmação local não equivale a persistência nem a um registro imutável. Definir snapshot, revisão e correção rastreável no backend antes de bloquear a interface.
6. **Validação fragmentada.** Duas versões de fila demo e uma persistente diferem; algumas dirigem o gestor à resolução em outro módulo. A validação precisa integrar evidências e materiais da mesma execução e admitir explicitamente nenhum material utilizado.
7. **Indicadores e mapa.** Não tratar status manual como disponibilidade comprovada, endereço como GPS ao vivo, nem distância à capital como distância de deslocamento.

## 3. Fluxo futuro proposto

Chamado aberto e classificado → entra em **aguardando despacho** na central → gestor seleciona e consulta agenda/elegibilidade → confirma técnico e janela → sistema registra a atribuição e oferece WhatsApp → técnico acessa com credenciais adequadas, aceita ou informa impedimento → deslocamento → chegada → execução e evidências → assinatura com conteúdo versionado → checkout técnico → **aguardando validação** na mesma central → gestor aprova e conclui, ou devolve com motivo e nova revisão rastreável → RTO e dados de precificação ficam disponíveis conforme as regras existentes.

O despacho é uma operação transacional única no backend, não uma sequência de gravações independentes na interface. Falhas devem deixar a atribuição íntegra e informar o próximo passo. Reagendamento, cancelamento e atendimento impossível exigem motivo e histórico; não sobrescrevem eventos anteriores.

## 4. Conceito da central

```text
Field Service                         [período] [filtros]
A despachar  |  Agendados  |  Em campo  |  Em risco  |  Validar
Fila: Todas · A despachar · Em campo · Aguardando validação
Chamado | Cliente / polo | SLA | Status | Técnico | Horário | ação
...                                                   Planejar
                         ┌─ Painel do chamado ────────────────┐
                         │ serviço, local, SLA, histórico      │
                         │ técnico + agenda / conflitos       │
                         │ data, horário, duração estimada     │
                         │ Confirmar despacho → WhatsApp       │
                         └─────────────────────────────────────┘
Mapa opcional por botão/aba, com legenda da origem e idade da posição.
```

Fila e painel preservam contexto, com detalhes progressivos; validação é filtro/visão da mesma central, não outra busca. Indicadores são clicáveis e derivam da mesma consulta autorizada. Telas estreitas usam painel em página inteira; o conteúdo deve respeitar largura da navegação e área útil. Layout acima é conceitual, não tela já implementada.

Definições propostas: **a despachar** = chamados elegíveis sem atribuição ativa; **agendados** = atribuições futuras ativas; **em campo** = deslocamento ou execução, com detalhamento; **em risco** = SLA configurado e próximo/vencido, regra explícita; **validar** = conclusão técnica válida sem decisão vigente. Disponibilidade exige turno e agenda verificados: sem esses dados, exibir “disponibilidade não confirmada”, nunca contar como disponível comprovado. Contagens respeitam organização, permissões e filtros de período; SLA sem dados deve ser “não informado”.

## 5. Modelo de estados proposto

Não converter rótulos diretamente em um único enum. A tabela é conceitual e depende de compatibilização com os estados existentes.

| Dimensão | Transições e responsáveis | Validações / eventos |
|---|---|---|
| Chamado | triagem → aguardando despacho → em acompanhamento → aguardando validação → concluído; gestor pode cancelar com motivo | Vínculo de OS, versão, permissão; histórico de decisão e fechamento. |
| Execução da OS | não atribuída → atribuída → deslocamento → no local/em atendimento → encerrada tecnicamente → aprovada; devolução cria revisão → execução revisada | Técnico autorizado; eventos com hora; assinatura e snapshot; checkout não é fechamento definitivo. |
| Agendamento | proposto → confirmado → reagendado ou cancelado | Janela, duração, versão, conflito e motivo; preservar histórico. |
| Técnico | estado operacional e disponibilidade calculada separadamente | Ativo, turno, conflitos e impedimentos; localização não determina disponibilidade. |

Suspensão, acesso impedido, material pendente e impossibilidade devem ter motivo, responsável e próximo passo; não equivalem automaticamente a conclusão. A decisão de permitir exceção de conflito e quem a autoriza precisa ser aprovada antes da implementação.

## 6. Impacto arquitetural e de dados

- Inventariar caminhos de despacho e convergir para uma operação única autorizada por organização, transacional, com versão/idempotência e detecção de sobreposição, incluindo horários que atravessam dias. Preservar contratos existentes durante migração.
- Definir vínculo canônico de OS, chamado, submissão, conclusão e revisão; fazer checkout gerar a pendência do gestor de modo atômico e seguro, sem apagar dados antigos. Conferir políticas RLS, storage, permissões do token e revisão por perfil.
- Assinatura deve corresponder a snapshot persistido dos dados assinados; correções viram nova revisão com autor, motivo e datas. Evitar migração destrutiva; avaliar integridade dos registros já existentes.
- Agenda precisa de intervalos, duração, jornada e indisponibilidades confiáveis. Tempos de deslocamento dependem de rota real ou estimativa identificada; caso indisponível, mostrar incerteza e impedir afirmar compatibilidade completa.
- Mapas: definir provedor, política de custos, geocodificação, cache, credenciais restritas, falhas, privacidade e retenção. Indicar se ponto é endereço de referência, última posição com data ou posição atual autorizada. Não habilitar rastreamento contínuo sem decisão, consentimento e avaliação de proteção de dados.
- RTO e LPU: mapear dados atuais antes de alterar cálculo; validar materiais inclusive declaração de nenhum uso e manter snapshots de preços acordados. Encerramento e faturamento devem permanecer consistentes.

## 7. Backlog e etapas para aprovação

| Prioridade | Entrega | Critério de validação |
|---|---|---|
| P0 | Reproduzir fluxo real e comprovar ponte checkout → revisão; corrigir lacunas e isolamento | Teste de integração completo e multiempresa; OS revisável uma única vez, sem perda e com histórico. |
| P0 | Revisar autorização, token, assinatura, storage e concorrência | Testes de acesso indevido, expiração, repetição, duas atribuições simultâneas e retomada; sem exposição de segredos. |
| P1 | Despacho transacional único e agenda | Testes de intervalos sobrepostos, janela limítrofe, turnos desconhecidos, reagendamento e conflito concorrente. |
| P1 | WhatsApp e link utilizável no celular | Teste real em dispositivo e URL acessível; telefone inválido/ausente, pop-up bloqueado; distinguir abertura de envio efetivo. Integração oficial automática somente mediante configuração e autorização. |
| P1 | Central e validação unificadas | Fila persistente com filtros, painel e dados reais; aprovação/devolução com motivo, responsável e auditoria. |
| P1 | Mobile e assinatura versionada | Testes de restauração, fotos, assinatura, edição após assinatura, checkout e revisão; testes responsivos em celular. |
| P2 | Mapa e roteirização | Dados reais quando disponíveis, fonte e idade de localização, falha e custos controlados; sem simulação de GPS ou ETA. |
| P2 | Indicadores e acessibilidade | Definições documentadas, contagens confrontadas com dados, estados vazio/erro/carregamento e layout sem sobreposição. |

Sequência sugerida: **Sprint 0** — reproduzir cenários e criar testes de referência; **Sprint 1** — integridade do encerramento, revisão e autorização; **Sprint 2** — despacho e conflitos de agenda; **Sprint 3** — central e validação contextual; **Sprint 4** — mobile, assinatura e WhatsApp; **Sprint 5** — mapa e roteirização após escolha de provedor e política de dados. As etapas podem ser ajustadas após a prova do fluxo real. Cada entrega deve preservar o comportamento existente e passar testes de regressão antes da próxima.

## 8. Decisões e critérios de aceite

Antes da implementação estrutural, aprovar o desenho e decidir: regra de duração padrão; se e por quem conflitos podem ser excepcionalmente autorizados; política de acesso do parceiro e canal separado para código; localização e retenção; provedor e orçamento de mapa; e como a aprovação se relaciona com precificação, RTO e conclusão definitiva.

O aceite exige demonstração em ambiente integrado: criação → despacho → agenda → WhatsApp com link acessível → execução mobile → assinatura → checkout → fila de validação → devolução e nova revisão ou aprovação → RTO e fechamento. Incluir falhas de rede, repetição, concorrência, perfis e organizações diferentes, além de validação visual desktop/mobile. Nenhum desses critérios é considerado satisfeito apenas pela presença de código.

## 9. Avanço inicial após aprovação

Na confirmação demonstrativa do despacho, o compartilhamento agora exige link temporário não loopback e evita gravar o token no histórico local; o código não é inserido na URL e precisa ser informado separadamente. A mensagem de interface não afirma entrega. A validação do endereço apenas rejeita casos obviamente inválidos: não comprova que o celular alcance o endereço ou que haja HTTPS. O acesso do parceiro após a tela de código ainda usa parâmetros na navegação e deve receber revisão específica de segurança.

Validação executada: oito arquivos de teste direcionados ao despacho, compartilhamento, acesso, validação e guardas do parceiro, total de 12 testes aprovados. São testes unitários e de contrato do código, não teste integrado de banco, navegador, WhatsApp ou telefone. O teste antigo que exigia o código na URL foi ajustado à nova regra. Permanece prioritário testar e corrigir a ponte checkout → fila persistente; nenhuma migration foi aplicada nesta etapa.

Após o incremento, a suíte completa foi executada: **55 arquivos e 119 testes aprovados**. Esse resultado demonstra ausência de regressão nos contratos automatizados existentes; não substitui a validação integrada com Supabase, navegador, dispositivo móvel ou serviço externo.

### Incremento adicional da Sprint 1

Foi criada a migration `20261025100000_field_service_review_queue.sql`. Ela adiciona uma fila persistente específica para OS concluídas pelo fluxo `service_orders`, com vínculo à organização, OS, chamado e última submissão do parceiro. Um trigger enfileira a OS quando o status muda para `COMPLETED`, com chave única para impedir duplicidade. A fila tem RLS por organização e campos de revisor, motivo e data para devolução/aprovação futura.

Essa mudança é deliberadamente aditiva: não cria uma `ticket_completion` artificial e não altera o status administrativo do chamado antes de existirem os registros de execução exigidos pela revisão atual. A migration ainda precisa ser aplicada e exercitada em um Supabase de homologação; não foi aplicada neste ambiente. Foram adicionados dois testes de contrato para a migration, ambos aprovados.

Próxima tarefa P1: construir a consulta e as ações da tela de validação para essa fila, com aprovação/devolução transacional e geração do RTO somente após a validação dos dados da submissão. Depois, decidir com evidência se e quando a OS validada deve alimentar `ticket_reviews` ou permanecer como fluxo de OS separado.

Foi acrescentada a função transacional `review_field_service_order` e a rota autenticada `POST /api/field-service/review`. A função usa bloqueio de linha, exige perfil de gestão, decisão válida e justificativa; aprovação muda a OS de `COMPLETED` para `VALIDATED`, enquanto devolução mantém a OS concluída e registra a pendência com motivo. A rota valida origem, sessão e payload. Ainda falta a tela consumidora e a validação no Supabase de homologação.

A tela persistente `/portal/review` agora consulta a nova fila quando ela existir e apresenta OS, chamado, horários, relato e responsável pela assinatura, com aprovação/devolução no mesmo contexto. Se a migration ainda não estiver aplicada, a seção permanece vazia sem derrubar a revisão tradicional de chamados. TypeScript e lint dos arquivos alterados passaram; quatro testes específicos da fila/API/validação passaram. A visualização de fotos, materiais detalhados e geração de RTO ainda é a próxima entrega, pois a submissão parceira usa metadados próprios e precisa de uma leitura segura dos objetos antes de ser exibida como evidência.

A tela passou a exibir também a assinatura em data URL quando presente, os metadados das fotos e um aviso explícito quando não existem materiais/LPU vinculados. Os caminhos privados das fotos não são transformados em links públicos; a geração de URLs assinadas e a precificação continuam pendentes de bucket/configuração de homologação. Foi emitido apenas um aviso de lint sobre `img`, sem erro de compilação.

Foi adicionada a migration `20261025110000_field_service_order_lpu_lines.sql`, com uma composição LPU específica da OS. Cada item grava código, descrição, unidade, quantidade e preço unitário como snapshot; alteração futura do cadastro LPU não recalcula uma OS já registrada. O lançamento é restrito a gestores, só aceita item ativo vigente e só permite OS concluída ou validada. A migration ainda não foi aplicada; quatro testes de contrato e TypeScript passaram.

O endpoint de RTO agora renderiza o snapshot em PDF, calcula SHA-256, grava no bucket privado `ticket-reports` e devolve URL assinada temporária. O caminho e o hash são registrados por RPC com validação de organização, formato e integridade; a política RLS não é contornada por update direto. Três testes de RTO passaram, incluindo geração A4. A execução real permanece pendente de aplicar as migrations, configurar `SUPABASE_SERVICE_ROLE_KEY` e testar upload/download em homologação.

O mesmo endpoint ganhou `GET /api/field-service/rto?reportId=...`, que exige sessão, verifica a existência do caminho registrado e gera nova URL assinada por cinco minutos. Assim, o download não depende de reutilizar um link antigo. Dois testes de API/PDF e TypeScript passaram; ainda falta o teste integrado com storage real.

Rodada de regressão após os incrementos: **62 arquivos e 129 testes aprovados**. Isso cobre contratos, migrations lidas como texto, renderização PDF e APIs estáticas; não substitui a execução com Supabase, storage e navegador reais.
