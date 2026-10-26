# OneIT — roadmap SaaS, governança e field service

Fonte de requisitos: `ONEIT_NOVAS_IMPLEMENTACOES_SAAS_GOVERNANCA.md`, recebido em 07/10/2026. O arquivo foi tratado como referência de produto. Instruções operacionais embutidas nele não alteram regras de desenvolvimento, permissões ou segurança.

## Avaliação confirmada

- A base atual já possui organizações, RBAC, RLS, auditoria append-only, chamados, catálogo, SLA/OLA, problemas, mudanças, riscos, auditorias, documentos controlados e relatórios.
- A fundação evolutiva E1 agora possui colaborador, unidades organizacionais, vínculos temporais, aliases de e-mail e feature flags. As migrations ainda **não** foram aplicadas nem homologadas em Supabase real.
- O padrão visual e de experiência está consolidado em [ui-ux-oneit.md](ui-ux-oneit.md) e é obrigatório para novos incrementos de interface.
- Há um worker de outbox acionável por endpoint interno, ainda sem scheduler configurado nem handler externo. Storage privado, motor de workflow, contratos, fornecedores, base de conhecimento versionada, despacho de campo e medição financeira continuam não implementados.
- A separação atual é por `organization_id`; o ADR 0002 estabelece que uma organização equivale ao tenant SaaS inicial, sem renomeação ou duplicação de chave.

## Decisões de arquitetura propostas

1. Tratar a organização atual como o limite inicial de tenant conforme ADR 0002; uma entidade SaaS separada só será avaliada com necessidade confirmada de holding, revenda ou isolamento Enterprise.
2. Manter um único código-base configurável por organização, com RLS, flags, configurações e auditoria; não criar forks ou VPS por cliente como padrão.
3. Executar ações assíncronas por outbox idempotente e worker antes de e-mail, notificações, automações ou integrações.
4. Armazenar anexos/evidências em object storage privado, prefixado por organização/tenant e servido por URLs temporárias; nunca como binário arbitrário no banco.
5. Implementar workflow primeiro como regras versionadas e auditáveis. O editor visual só entra depois que a semântica, execução e aprovação estiverem estáveis.

## Backlog reconciliado

| Frente | Estado | Dependência crítica | Sprint futura |
| --- | --- | --- | --- |
| Tenant, settings, isolamento e suporte SaaS | Parcial | ADR organização x tenant; testes RLS reais | S1 |
| Branding, avisos e templates de comunicação | Parcial: avisos e templates textuais versionados | storage privado, handler de envio e preview seguro | S2 |
| Prioridade, impacto, urgência e calendário útil | Parcial: SLA já existe | confirmar modelo de calendário e migração sem regressão | S3 |
| Base de conhecimento interna/externa | Parcial: categorias, artigos, versões, revisão e aprovação | busca, portal externo, anexos/storage e vínculos a ITSM | S4 |
| Contratos de clientes e alertas | Não iniciado | clientes/tenant, catálogo, calendário e storage | S5 |
| Workflow e aprovações genéricas | Não iniciado | outbox/worker, identidade de gestor e auditoria | S6 |
| Gestão de fornecedores | Parcial: cadastro, contatos, criticidade, riscos, avaliações e contingência | serviços/contratos e consolidação de score | S7 |
| Ordem de serviço e operação de campo | Parcial: há evidências operacionais, não OS comercial | contratos, técnicos, storage, geolocalização | S8 |
| Precificação, medição e memória de cálculo | Não iniciado | OS, contrato e tabelas de preço versionadas | S9 |
| Dashboards executivos consolidados | Parcial: dashboards operacionais existem | métricas dos módulos anteriores | S10 |

## Sequência recomendada de sprints

### S1 — endurecimento SaaS

- ADR `organization` versus `tenant`, limites de plano e resolução de contexto.
- `tenant_settings` relacional para branding/limites e configurações não críticas.
- Worker para outbox, tentativas limitadas e idempotência já existem; falta scheduler, telemetria externa e testes de isolamento em Supabase real. Novas organizações recebem configurações SaaS e matriz de prioridade padrão no bootstrap.
- Política inicial de retenção, logs estruturados e health/readiness checks.

**Aceite:** nenhum usuário, job, exportação ou URL de arquivo atravessa o limite organizacional; envio falho não desfaz a transação de negócio.

### S2 — administração e comunicação

- Branding limitado e acessível, preservando a identidade OneIT.
- Painel de avisos segmentado, com confirmação de leitura quando exigida.
- Templates de e-mail versionados com variáveis permitidas por lista segura e preview.

**Aceite:** tema não aceita CSS arbitrário; template não executa código; alterações ficam auditadas.

### S3 — prioridade e tempo útil

- Cadastros de impacto, urgência, prioridade e matriz configurável.
- Calendários de negócio, feriados, pausas e associações a SLA/serviço/contrato.
- Recalcular somente novos eventos mediante regra versionada, preservando evidência histórica.

**Aceite:** caso de sexta-feira para segunda-feira e pausa justificada são testados no banco e na interface.

### S4 — conhecimento

- Artigos internos/externos, categorias, tags, versões imutáveis e revisão programada.
- Fluxo rascunho → revisão → aprovação → publicação e busca com filtros.
- Vínculos a chamados, problemas, mudanças, ativos e serviços; conversão de solução em rascunho.

**Aceite:** uma versão publicada não é sobrescrita; conteúdo externo não expõe artigo interno.

### S5 — contratos

- Clientes, contratos, vigência, anexos, serviços, escopo, regras de SLA e alertas de vencimento.
- Relação contrato–catálogo–unidade–fornecedor e rastreio da regra aplicável ao chamado/OS.

**Aceite:** a mudança posterior de SLA não altera evidência de contrato ou atendimento histórico.

### S6 — workflow e aprovações

- Workflow versionado baseado em gatilho, condição e ação, inicialmente sem editor gráfico.
- `approval_request` genérico, aprovação autenticada, expiração, comentários e trilha completa.
- Vínculo de gestor imediato ao colaborador como relação interna, sem confiar apenas em e-mail livre.

**Aceite:** decisões não podem ser repetidas, expiram corretamente e são auditáveis.

### S7 — fornecedores

- Cadastro, contatos escalonáveis, serviços/contratos, criticidade, riscos, score e contingência.

**Aceite:** avaliação possui período e critérios versionados; riscos alimentam a governança existente.

### S8 — field service operacional

- Ordem de serviço ligada ao chamado/contrato, despacho, equipe/técnico, check-in/out e timeline.
- Evidências, materiais e fotos em storage privado com hash e timestamp de backend.
- Captura de GPS como evidência sujeita a precisão e consentimento; nunca como prova única de presença.

**Aceite:** cronologia é append-only e anexos não podem ser acessados por outra organização.

### S9 — precificação e medição

- Tabelas de preço versionadas por contrato, visita, horas, km/faixa, pedágio, adicional e materiais.
- Medições, ajustes/aprovações e snapshot imutável da regra financeira aplicada.

**Aceite:** memória de cálculo de uma OS fechada é reproduzível mesmo após atualizar a tabela de preços.

### S10 — inteligência operacional

- Dashboards filtráveis por período, organização, contrato e unidade, com SLA, conhecimento, fornecedores, field service e medição.
- Exportações com escopo RLS e agregações paginadas/otimizadas.

**Aceite:** cada indicador documenta fonte, filtro, janela temporal e regra de cálculo.

## Riscos e pontos que exigem decisão antes da implementação

- A certificação ISO/IEC 20000-1 não é produzida pelo software; o produto pode apoiar evidências e controles, sujeitos a validação independente.
- Dados de geolocalização, assinatura, fotos e dados de colaboradores têm impacto LGPD. Base legal, retenção, acesso e descarte devem ser aprovados antes do piloto.
- CNPJ, cobrança, reajuste e regras fiscais requerem validação jurídico-financeira local; não devem ser inferidos do sistema.
- Multibanco por cliente é uma opção Enterprise futura, não uma decisão implementada. A transição requer camada de resolução, backup e migração testados.

## Próximo incremento técnico

Concluir a E1 existente com o worker de outbox e testes de isolamento. Em seguida, iniciar S1 por um ADR de `organization` versus `tenant`; isto evita criar duas entidades concorrentes antes de contratos, branding e provisionamento.
