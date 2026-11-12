# OneIT — evolução do produto FSM, fluxos e experiência

Data: 29/10/2026. Escopo: análise e proposta; nenhuma implementação, migration ou alteração de dados de produção neste ciclo.

## 1. Parecer

Recomendo **refatoração modular das jornadas**, preservando Next.js, React, TypeScript, Supabase/PostgreSQL, os componentes reutilizáveis e a identidade clara do OneIT. Não há evidência nesta rodada que justifique reconstruir tudo ou trocar a stack.

O problema mais relevante é a representação fragmentada do atendimento: chamado, visita, agenda, validação e documento exibem estados e próximas ações que não se reconciliam na experiência do gestor. Acrescentar mapas ou inteligência artificial antes dessa integração ampliaria a complexidade.

A direção proposta é: **uma OS compreensível em qualquer tela; uma central de decisões para o gestor; uma jornada guiada para o técnico; uma cadeia auditável até o faturamento.** Isso não significa fundir todas as entidades em uma tabela ou colocar todos os formulários na mesma página.

## 2. Evidência e limites

Inspeção de código e navegação autenticada, somente leitura, em `https://oneit-okaa1.vercel.app`. Foram observadas as telas de início, dashboard, chamados, detalhe de chamado, abertura pelo catálogo, central Field Service, validação, rotas, agenda gerencial, catálogo administrativo e BM. Capturas foram inspecionadas na ferramenta de navegador; não foram exportadas como arquivos de evidência.

O código local e a aplicação publicada foram correlacionados por comportamentos observáveis. Não foi confirmada igualdade de SHA entre checkout e deploy. Achados de SQL descrevem o repositório; não comprovam a versão aplicada ao banco remoto.

Não houve criação, edição, cancelamento, despacho, upload, assinatura, fechamento ou envio de e-mail/WhatsApp nesta análise. Mobile público, PDFs gerados, permissões entre organizações, concorrência, restauração, carga e todos os breakpoints **não foram homologados nesta rodada**. Não foram executados testes automatizados novos. Resultados do ciclo anterior permanecem separados em `12-REGISTRO-CICLO-1.md`.

Classificação: **confirmado** = observado na aplicação ou diretamente no código; **risco** = consequência possível ainda sem reprodução; **proposta** = evolução recomendada, não funcionalidade entregue.

## 3. Achados prioritários

| ID / prioridade | Evidência e situação atual | Consequência / causa | Recomendação e aceite |
|---|---|---|---|
| FSM-01 / P1 | Confirmado: menu “Agenda Técnicos” aponta para `/portal/field`; a conta gerencial recebe redirecionamento de acesso restrito. `src/app/(portal)/layout.tsx:9`; `portal/field/page.tsx:25–27`. `/portal/scheduling` abre uma agenda gerencial real. | Destino incorreto para a persona; não é motivo para relaxar a autorização do portal técnico. | Menu por papel apontando à agenda gerencial. Gestor abre agenda; técnico continua limitado às próprias OS. Testar navegação e acesso direto. |
| FSM-02 / P1 | Confirmado: links de OS em rotas e agenda usam `/portal/tickets?ticket=...`; `portal/tickets/page.tsx:8` só consome `message`. Clique abriu a fila inteira. | Ação “Abrir OS” perde o contexto. | Link para detalhe canônico ou seleção contextual implementada. Todo compromisso deve abrir exatamente seu chamado autorizado, inclusive após recarga. |
| FSM-03 / P1 | Confirmado: central conta `DISPATCHED` junto de execução em “Em campo”; `dispatch-workspace.tsx:18,48,145`. Na observação, central exibia 2 agendadas como em campo e dashboard exibia 4 em campo. | Definições distintas geram indicadores enganosos. Não foi estabelecida corrupção dos registros. | Definir agendadas, deslocamento, execução e validação separadamente; mesma fonte de agregação, filtros e instante de referência. Cada contador abre os registros que o compõem. |
| FSM-04 / P1 | Confirmado: FSM-2026-000003 e 000005 constam aprovados na revisão, porém a fila mantém “Aberto · Atribuído” e “Ver agendamento”. FSM-000005 ainda exige encerramento final. | Chamado aberto antes da conclusão definitiva pode ser válido; a próxima ação e o estágio apresentados são inadequados. | Projeção operacional combinando chamado, OS, revisão, RTO e fechamento. Exibir “RTO pendente” ou “Aguardando encerramento”, sem forçar uma única coluna de status para conceitos diferentes. |
| FSM-05 / P1 | Confirmado: BM UI/API aceitam organização + competência; `src/app/api/field-service/measurement/generate/route.ts:6`; migration `20261028170000_generate_measurement_from_field_service.sql` filtra fechamento pela organização e mês, sem cliente/contrato. | Se a organização atende vários clientes/contratos, o agrupamento atual pode misturar cobranças. Não foi executada geração remota para demonstrar o efeito. | Definir escopo comercial do BM e destinatários; agrupar por cliente e contrato quando aplicável. Teste com dois clientes na mesma organização; preservar boletins existentes com transição aditiva. |
| FSM-06 / P1 | Confirmado no código: agenda sem `ticket_schedule` deriva fim como `scheduled_at + 1 hora`, `portal/scheduling/page.tsx:30`. UI mostrou janela 13h–14h. | Uma duração inferida pode parecer um compromisso confirmado. Período comercial não equivale a duração técnica. | Distinguir janela prometida (manhã/tarde/noite), duração estimada e bloqueio real da agenda. Exibir “duração não informada” quando necessário; não fabricar precisão. |
| FSM-07 / P2 | Confirmado: detalhe usa âncoras `#principal`, `#comunicacoes`, `#historico`, não abas; `ticket-case-file-view.tsx:52–56`. Exibe `INCIDENT`, `LOW`, `AWAITING_TRIAGE`; cliente e local não dominam o resumo. | Rótulos internos e seções simultâneas elevam a carga cognitiva. | Abas reais e resumo cliente/polo/contato/serviço/técnico/agendamento; estados traduzidos. Comunicação e histórico preservados sem ocupar a tela inicial. |
| FSM-08 / P2 | Confirmado visualmente: tabela de chamados ocupa uma faixa estreita em desktop amplo; códigos quebram em várias linhas e ação depende de rolagem horizontal. `portal/tickets/page.tsx` usa `max-w-6xl`; `tickets-table.tsx` apresenta nove colunas. | Mesma largura de formulário aplicada à fila operacional; baixa prioridade visual do próximo passo. | Lista fluida na área restante do menu; colunas essenciais e ação fixa. Validar 1280, 1440, 1920 px e acesso móvel sem esconder ações. |
| FSM-09 / P2 | Confirmado: revisão mistura aprovadas com RTO pendente, RTO salvo aguardando fechamento e já encerradas em cards verdes semelhantes. `portal/review/page.tsx:119`. | “Aprovada” não informa qual trabalho falta; histórico compete com pendência. | Visões “A validar”, “Documento pendente”, “A encerrar”, “Histórico”, sobre a mesma cadeia de dados. Contagem de pendências exclui encerradas. |
| FSM-10 / P2 | Confirmado: agenda/central/revisão/tickets usam listas limitadas; chamados 500 (`tickets/page.tsx:19`), revisão 50 por estado (`review/page.tsx:34,38,40`). | Risco de contadores truncados e buscas que ignoram registros antigos, ainda não reproduzido com volume. | Paginação e agregação no servidor, filtros iguais entre lista e total. Testes acima dos limites atuais. |
| FSM-11 / P2 | Confirmado: catálogo administrativo apresenta três formulários simultâneos e pouca orientação; `/portal/service-catalog`. A abertura, por outro lado, já tem seleção de serviço em duas etapas. | Cadastro reflete a hierarquia técnica antes da tarefa; risco de combinação incompleta. | Preservar seletor de abertura; administração orientada a “Criar serviço”, com categoria/subcategoria existentes ou criação contextual autorizada. |
| FSM-12 / P2 | Confirmado: em Financeiro, menu marca também Agendamento de OS como ativo. `portal-sidebar-light.tsx` usa prefixo para ambos os links. | Ambiguidade sobre onde o usuário está. | Selecionar a rota mais específica; exatamente um `aria-current=page`. |
| FSM-13 / P2 | Observada mudança de horário de três horas entre navegações; `tickets-table.tsx` e `ticket-case-file-view.tsx:73` formatam sem timezone explícito; rotas usam São Paulo. | Causa provável: formatação servidor/cliente com fusos distintos. Não foi verificada alteração do timestamp persistido. | Formatador único com timezone de negócio explícito; testes SSR/hidratação e virada do mês. |
| FSM-14 / P1 investigativo | `dispatch-workspace.tsx` abre WhatsApp depois de operações assíncronas e usa retorno de `window.open` para fallback. | Risco de bloqueio de popup e interpretação incorreta de retorno nulo com `noopener`; envio não foi testado nesta rodada. | Despacho idempotente e abertura vinculada ao gesto do usuário; se bloqueada, botão “Abrir conversa” mantém o agendamento já salvo. Nunca registrar entrega por apenas abrir a conversa. |

### Divergência produtiva entre perspectivas

- Operação deseja resolver tudo na central; UX recomenda limitar o contexto aberto. Conciliação: fila + painel lateral, alternância Agenda/Mapa e recolhimento de áreas secundárias, sem mostrar tudo simultaneamente.
- Produto deseja “aprovar e encerrar” em uma ação; engenharia precisa tratar falha de PDF/storage. Conciliação: uma ação orquestrada com etapas persistidas e retomada, sem fechar antes do documento obrigatório ficar salvo.
- Financeiro precisa de preço consistente; técnico precisa relatar o serviço com simplicidade. Conciliação: execução factual do técnico separada da precificação aprovada pelo gestor; composição não pode cobrar novamente material já incluído.
- “Offline” melhora a continuidade, mas não pode ressuscitar a demonstração. Conciliação: rascunho temporário explicitamente pendente; o servidor permanece a fonte oficial. Nada de sucesso fictício nem fallback de produção para dados locais.

## 4. Fluxo operacional recomendado

1. **Abrir chamado:** escolher serviço e preencher apenas contexto faltante. Empresa, departamento e solicitante vêm dos vínculos autorizados. Dados herdados ficam visíveis e corrigíveis conforme permissão; erro preserva o formulário.
2. **Planejar visita:** reutilizar polo, endereço e contato. Selecionar técnico e período; consultar compromissos, jornada, requisitos e deslocamento disponível. Ausência de estimativa não deve parecer disponibilidade confirmada.
3. **Agendar e preparar WhatsApp:** persistir despacho, validar concorrência, oferecer conversa com link restrito à OS, data/período, contato e Waze. Para parceiro, pedir telefone quando necessário. Mensagem preparada não significa enviada ou entregue.
4. **Executar:** aceitar quando aplicável → iniciar deslocamento → chegada/início → descrição e três fotos → nome/assinatura do responsável → checkout. Próxima ação dominante; progresso derivado de eventos confirmados no servidor.
5. **Validar:** cliente, polo, serviço solicitado e executado primeiro; depois evidências, assinatura, tempos e LPU. Quantidade × preço unitário, subtotal e total. Serviço apenas de mão de obra é legítimo; ausência de material não exige justificativa artificial.
6. **Aprovar, gerar RTO e encerrar:** ação principal coordena etapas já existentes. PDF falhou? Mostrar pendência recuperável e retomar sem reaprovar ou duplicar. Fechamento depende do documento salvo quando essa for a regra. Confirmação de sistema externo só deve ser exigida quando houver vínculo externo que a justifique.
7. **Medir:** selecionar cliente/contrato e competência; mostrar elegíveis, excluídas com motivo e precificação. Congelar versão aprovada; enviar pelo serviço corporativo com histórico. Contestação e liberação fiscal seguem regra contratual expressa.

```mermaid
flowchart LR
  A[Chamado classificado] --> B[Agendar visita]
  B --> C[Execução técnica]
  C --> D[Checkout]
  D --> E[Validação e LPU]
  E -->|Devolver com motivo| C
  E -->|Aprovar| F[RTO gerado e armazenado]
  F --> G[Encerramento definitivo]
  G --> H[BM por cliente e competência]
```

Devolução deve criar revisão rastreável e preservar evidências assinadas. O desenho acima simplifica a jornada, não elimina os controles internos.

## 5. Organização das telas

### Gestor

**Dashboard** direto, acima dos grupos do menu. Indicadores de atenção, prazo e volume; competência discreta no topo direito. Uma definição única para cada métrica e acesso à lista correspondente.

**Operação:** Chamados; Agendamento de OS; Validação de OS; Agenda Técnicos; Rotas planejadas; RTO Encerrados. Manter os nomes solicitados, mas integrar contexto e filtros. Agenda e rotas podem compartilhar uma área com modos diferentes, preservando links antigos. Não reintroduzir Ativos/Conhecimento/Fornecedores como prioridade.

**Faturamento:** BM, encaminhamento fiscal e histórico. **Configurações:** cadastros, catálogo, LPU, permissões e integrações, com acesso conforme perfil.

Central, desenho textual proposto:

```text
Agendamento de OS                   Dia | Cliente | Região | Busca
Não agendadas   Agendadas   Em execução   A validar   Em risco
[Fila] [Agenda] [Mapa]
OS / Cliente e polo / Serviço / Prazo / Técnico / Situação / Ação
                                                    Painel contextual
                                                    Dados herdados
                                                    Técnico + agenda
                                                    Dia + período
                                                    Confirmar despacho
```

O mapa é um modo de trabalho, não um painel permanente que comprime a fila. Rotas por técnico e manhã/tarde/noite já existem e devem ser aproveitadas; adicionar estado atual, abertura correta e estimativas identificadas pela fonte.

### Detalhe do chamado

Cabeçalho compacto: número, assunto, cliente/polo e situação. Uma ação principal correspondente ao estágio. Coluna principal com descrição; lateral com contato, serviço, técnico, agendamento e prazo. Abas reais: Principal, Atendimento, Comunicações, Histórico e Documentos. Informações avançadas sob expansão contextual.

### Validação

Lista compacta à esquerda ou em tela de fila; detalhe selecionado com cabeçalho inequívoco e três áreas: **Execução e fotos**, **Precificação**, **Decisão e documento**. Fotos em quadros iguais, com ampliação. Barra de decisão acessível sem cobrir conteúdo. Histórico de encerrados recolhido em consulta própria.

### Cadastro e catálogo

Empresa/cliente com abas Unidades, Contatos, Contratos e Serviços habilitados; criação contextual reaproveita entidades existentes, sem duplicá-las. Pessoa, usuário de acesso e técnico são conceitos relacionados, não sinônimos.

Catálogo solicitável e LPU de cobrança continuam separados, mas podem ter sugestões vinculadas. Duas opções:

| Opção | Benefício | Limitação |
|---|---|---|
| Lista de serviços com árvore/filtro de categorias e editor contextual | Boa manutenção em volume, busca, status e dependências visíveis | Exige detalhes progressivos para regras avançadas |
| Assistente Categoria → Subcategoria → Serviço → Publicação | Orienta implantação inicial | Torna edição recorrente mais longa |

Recomendação: primeira opção no uso diário; assistente opcional para implantação. Preservar o seletor simples em duas etapas na abertura do chamado. Administrador deve poder pré-visualizar o formulário que o solicitante verá.

## 6. Design System: preservar e corrigir

Preservar marca OneIT, superfícies claras, azul institucional, componentes `OneitPageHeader`, `OneitSection`, `OneitStatusBadge`, botões e o drawer de abertura. Consolidar os tokens já presentes em `src/app/globals.css`; evitar nova biblioteca por preferência estética.

- Espaçamento: escala existente de 4 px; tokens semânticos compartilhados.
- Tipografia proposta: título de página 22–24 px, seção 16–18, conteúdo 14–16, auxiliar 12–13; revisar contraste e leitura, não reduzir tudo para caber.
- Lista operacional fluida; formulários com largura de leitura controlada. Não aplicar o mesmo `max-width` a todos os tipos de tela.
- Azul para ação e seleção; laranja para pendência/risco; verde para etapa realmente concluída; vermelho para erro impeditivo. Cor acompanhada de texto/ícone.
- Tabelas: número, cliente/polo, assunto/serviço, situação, prazo, responsável e próxima ação. Colunas secundárias opcionais; datas e valores alinhados consistentemente.
- Navegação: uma seleção ativa, nomes iguais entre menu e título, retorno preservando filtros. Cancelamento em ação secundária com motivo e histórico; evitar “Excluir da fila” se a operação real é cancelar.
- Estados vazios pequenos e úteis. Recolher o planejador quando não houver chamado selecionado; não ocupar metade da tela com orientações repetidas.
- Formulários: labels persistentes, erro junto ao campo, dados preservados, feedback de gravação e proteção a clique repetido.
- Acessibilidade: foco visível e não encoberto, teclado, headings coerentes, abas com semântica correta, contraste AA e teste com zoom. Alvo móvel recomendado de 44–48 px; WCAG 2.2 AA define mínimo de 24×24 CSS px com exceções, não 44 px como obrigação universal.
- Validar desktop 1280/1440/1920, tablet e 360/390 px; menu, rodapé e diálogos não podem cobrir ações.

## 7. Inovações com valor operacional

| Evolução proposta | Valor concreto | Pré-requisito / controle |
|---|---|---|
| **Despacho assistido e explicável** | Sugerir técnicos por competência, jornada, região, agenda e deslocamento; mostrar por que cada opção é indicada ou bloqueada. | Dados mestres confiáveis, duração e fonte de rotas. Começar com regras; decisão final humana. Distância geográfica não é tempo por rota. |
| **Central de exceções** | Destacar visita sem aceite, sem saída prevista, parada, devolvida, RTO com falha ou preço pendente. | Eventos e critérios claros; deduplicação de alertas. Só avisar quando houver ação útil. |
| **Preparação da visita** | Mostrar contato confirmado, acesso ao local, serviço, materiais previstos e pendências antes da saída. | Reutilizar cadastro; confirmação do cliente opcional e comunicação autorizada. Não criar bloqueio burocrático universal. |
| **Histórico operacional do polo** | Técnico encontra contato, restrições de entrada, fotos e ocorrências relevantes anteriores. | Escopo por OS/cliente e minimização de dados. Não depende de criar uma CMDB. |
| **Evidência resiliente** | Compressão, progresso por foto, falha individual, retomada e confirmação real de salvamento. | Storage testado, idempotência, vínculos corretos. Rascunho offline é pendência temporária, jamais fonte oficial ou sucesso simulado. |
| **Assistência de relatório e LPU** | Sugerir resumo a partir do relato e possíveis composições; reduzir trabalho de conferência. | Aprovação humana; não inventar atividade nem quantidade; não cobrar material de novo quando incluído na composição. IA opcional após estabilização. |
| **Receita pronta versus bloqueada** | Mostrar valor apto a medir e OS travadas por documento, preço ou contrato, com ação para resolver. | Escopo comercial e snapshots de valores confiáveis. Trabalho sem material pode ter preço de visita/mão de obra. |
| **Acompanhamento do cliente** | Link restrito com janela, situação e conclusão; reduz pedidos de atualização. | Separar link do cliente e link de execução técnica; expiração/revogação, sem localização pessoal desnecessária. |
| **Manutenção recorrente** | Gerar visitas previstas e checklists por serviço para contratos recorrentes. | Introduzir somente após estabilizar reabertura, cancelamento e recorrência sem duplicações. |

Não priorizar agora: otimização automática complexa de frota, chatbot genérico, rastreamento permanente, CMDB ampla, microsserviços ou novos dashboards decorativos.

## 8. Arquitetura e integridade que sustentam a experiência

- Manter entidades distintas: chamado = demanda; OS/visita = execução; agendamento = compromisso; revisão = decisão; RTO = documento versionado; linha LPU = preço aprovado; BM = consolidação comercial.
- Criar uma projeção de leitura compartilhada para estágio exibido, próxima ação e indicadores. Não renomear enums isoladamente na interface nem transformar status da OS em encerramento automático do chamado.
- Uma operação oficial de despacho para todos os pontos de entrada. Preservar transações, elegibilidade, conflito de agenda e versão concorrente.
- Cadastro técnico canônico com compatibilidade explícita: o ciclo anterior encontrou trigger de sincronização e escrita adicional nas actions. Consolidar após verificar migrations realmente aplicadas; não remover tabelas com dependências.
- Agregações e paginação no banco, não contagem de arrays truncados. Falha de consulta não pode virar “nenhum técnico” ou “nenhum compromisso”.
- Gerar e armazenar PDF com estados rastreáveis e reexecução segura. Arquivo disponível e chamado fechado devem ser verificáveis independentemente da mensagem de sucesso.
- No BM, definir cliente/contrato, data que determina competência e revisões. O SQL examinado usa `closed_at` tanto para seleção do mês quanto para `service_date`; confirmar a regra comercial antes de alterar para data de execução.
- Dados assinados e preço aprovado precisam de versões históricas. Alteração de cadastro/preço não deve reescrever o RTO/BM já emitido.

## 9. Sequência recomendada e critérios de conclusão

| Onda | Entrega | Aceite verificável |
|---|---|---|
| 0 — Coerência imediata | Corrigir destino da agenda, links de OS, próxima ação, indicadores e data/hora. | Gestor abre agenda sem bloqueio; clique abre registro exato; mesma OS tem estágio coerente; contadores correspondem aos filtros; SSR/cliente exibem mesmo horário. |
| 1 — Integração operacional | Consolidar cadastro técnico, agenda/despacho, projeção de estados e histórico. | Criar/editar/inativar técnico reflete nos seletores; concorrência impede duplo despacho; histórico conecta eventos sem duplicação e sem perder autoria. |
| 2 — Jornada e interface | Chamado com abas reais; validação por tarefa; listas fluidas; catálogo contextual. | Usuário identifica cliente/polo/próxima ação sem procurar; formulários preservam dados em erro; teclado e breakpoints passam; nenhuma ação útil desaparece. |
| 3 — RTO e financeiro | Orquestração recuperável e BM com escopo comercial explícito. | Falha de PDF não fecha chamado nem duplica documento; reexecução retoma. Dois clientes/contratos não se misturam; totais conferem item a item; versões preservadas. |
| 4 — Inovação | Sugestão explicável de técnico, exceções, preparação e receita bloqueada. | Medir ganho em homologação; falha de mapas preserva despacho manual; nenhuma aprovação/envio é automatizada indevidamente. |

Primeiras cinco tarefas: (1) agenda por perfil e links corretos; (2) estágio e próxima ação compartilhados; (3) indicadores/fuso/paginação coerentes; (4) interface de detalhe e revisão alinhada ao novo estágio; (5) escopo e homologação do BM antes de ampliar faturamento.

Rollback: mudanças de interface independentes; contratos existentes mantidos durante transição; migrações aditivas e backfill auditável apenas quando necessário. Não apagar históricos, tabelas legadas ou documentos emitidos para simplificar o novo modelo.

## 10. Homologação e métricas

Executar com dados sintéticos em homologação: duas organizações, dois clientes em uma organização, dois contratos, técnico próprio/parceiro, múltiplos polos, visita sem material, serviço composto, OS devolvida e documento com falha.

Cobertura: CRUD → seletor → despacho → WhatsApp preparado → aceite/deslocamento/chegada → três fotos → assinatura → checkout → revisão/LPU → RTO armazenado → fechamento → BM → consulta histórica. Também: recarga, rede interrompida, token expirado, acesso indevido, duplo clique, dois gestores concorrentes, cancelamento e reprocessamento de PDF.

Medir antes/depois: mudanças de tela e cliques por tarefa, tempo observado para despacho/validação, erros de gravação, abandono, pendências de documento, divergência contador/lista e latência p95 por operação. Não há baseline quantitativo suficiente nesta rodada para prometer redução percentual ou prazo de sprint.

## 11. Referências e adaptação

- [Microsoft — aplicativo móvel Field Service](https://learn.microsoft.com/en-us/dynamics365/field-service/mobile-power-app-overview): referência para execução no campo e continuidade com conectividade limitada. Não comprova recursos equivalentes no OneIT.
- [Microsoft — filtros da agenda](https://learn.microsoft.com/en-us/dynamics365/field-service/schedule-board-filtering): referência para apoiar escolha de recurso por critérios operacionais. Adaptar à dimensão real da equipe.
- [W3C — tamanho mínimo de alvos](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum): referência verificável de acessibilidade; demanda testes na implementação.

Não copiar identidade de fornecedores. A vantagem do OneIT deve vir da integração entre chamado, trabalho em campo, evidência, precificação e medição, com menos decisões repetidas.

## 12. Decisões pendentes

1. Escopo do BM: por cliente/contrato, admitindo consolidado de contratos apenas quando comercialmente autorizado.
2. Competência: fechamento gerencial ou execução, incluindo fechamento tardio. O código atual usa fechamento.
3. Jornada e duração: períodos prometidos versus tempo previsto por serviço e jornada de cada técnico.
4. Mapas/localização: provedor, custos, origem/frescor da posição e consentimento; nunca simular localização ao vivo.

Essas definições não impedem corrigir a navegação, a linguagem, os links e a coerência visual. Não foi emitido parecer de aptidão para produção nesta análise.
