# Backlog consolidado da auditoria 360°

| ID | Prioridade | Achado | Evidência | Próxima ação | Estado |
|---|---|---|---|---|---|
| A360-P0-01 | P0 | Grants/RLS e migrations ainda sem homologação completa | 165 migrations aplicadas em Supabase local novo no job de banco [40365387614](https://github.com/felipebuso7/oneit/actions/runs/40365387614); matriz RLS e upgrade de base existente não executados | Testar duas organizações, permissões e upgrade em cópia segura | Parcial: instalação limpa aprovada; RLS/upgrade abertos |
| A360-P0-06 | P0 | Prefixo temporal duplicado impedia instalação limpa | `report_evidence_paths.sql` passou a `20261024120500`; auditoria estrita e instalação limpa aprovadas no CI | Conferir histórico antes de atualizar qualquer base OneIT existente | Parcial: instalação limpa aprovada; reconciliação de upgrade aberta |
| A360-P0-07 | P0 | Clientes autenticados podiam forjar envio e alterar lote fiscal diretamente | Auditoria efetiva [40322140259](https://github.com/felipebuso7/oneit/actions/runs/40322140259) confirmou grants; [40364047591](https://github.com/felipebuso7/oneit/actions/runs/40364047591) confirmou a restrição do log; o job de banco [40366832191](https://github.com/felipebuso7/oneit/actions/runs/40366832191) aprovou grants e teste transacional sob `service_role` | Testar `authenticated` de duas organizações e upgrade de base com dados | Parcial: grants e transição corrigidos na branch, sem migração remota ou homologação multiusuário |
| A360-P1-07 | P1 | Valores novos do enum financeiro eram usados na mesma transação da criação | CI reprovou em `20261024120000_billing_final_fiscal_workflow.sql`; adição foi separada em `20261024115000_measurement_status_extensions.sql` e instalação limpa passou | Validar upgrade de qualquer base já inicializada e transições fiscais com dados de teste | Parcial: instalação limpa aprovada; upgrade e fluxo abertos |
| A360-P0-02 | P0 | O fluxo principal `/demo` grava chamados e Field Service em `localStorage`, separado do portal autenticado | `src/app/page.tsx` leva a `/demo`; `src/app/demo/tickets/page.tsx` lê e grava `ticketsStorageKey`; o portal usa Supabase | Integrar a jornada usada pelo gestor e técnico a APIs autenticadas e dados persistidos; testar em dois dispositivos, incluindo permissões e falhas de rede | Aberto; um banner não resolve a operação compartilhada |
| A360-P1-01 | P1 | Worker financeiro não comprovado | endpoints claim/result existem, chamadas de worker não encontradas em `src`/`scripts` | Definir executor, retry, idempotência e homologar provedor | Aberto |
| A360-P1-02 | P1 | Jornada Field Service real não homologada | contratos automatizados existem; mapa, agenda e dispositivo real não testados | Executar cenário E2E em ambiente isolado | Aberto |
| A360-P1-03 | P1 | OAuth/e-mail e WhatsApp não têm prova de provedor real | somente contratos e abertura de conversa foram testados | Configurar sandbox e registrar evidência de envio/erro | Aberto |
| A360-P1-09 | P1 | BM/fiscal demonstrativos não enviam e-mail nem bloqueiam competência no servidor | `finance/page.tsx` e `fiscal/page.tsx` apenas mudavam `localStorage`, mas gravavam `emailSentAt`, `finalEmailSentAt` e `immutableAt` | Conectar fluxo autenticado à fila e ao worker de e-mail, validar destinatários/versão/anexo, aguardar aceitação do provedor e só então liberar encerramento fiscal transacional | Parcial; UI identifica simulação e a fila agora valida contexto/versão, mas envio real e bloqueio permanecem abertos |
| A360-P1-10 | P1 | Fechamento fiscal exige log `SENT` por BM, mas e-mail fiscal é enfileirado só por lote | `20261025200000_measurement_close_requires_sent_email.sql` exige `measurement_sheet_id`; `queue-email/route.ts` grava `fiscal_batch_id` sem BM | Definir vínculo lote–BMs para comprovação de envio e fechamento, corrigir em migração nova e testar lote com vários BMs em banco restaurado | Aberto; impedimento documentado em `19_FILA_EMAIL_VALIDACAO_CONTEXT.md` |
| A360-P1-11 | P1 | Transição `SENT_FOR_CONTESTATION` registra horário de envio antes de comprovação do provedor | `20261025200000_measurement_close_requires_sent_email.sql` grava `sent_to_customer_at` diretamente | Condicionar registro de envio à confirmação do worker e distinguir fila, aceite e entrega quando houver evidência | Aberto; sem migração neste ciclo |
| A360-P1-04 | P1 | RLS/escopo por organização não validado em banco | regras existem no código/migrations; sem execução real | Testar matriz de acesso com duas organizações | Aberto |
| A360-P1-12 | P1 | Técnico recém-cadastrado nascia `UNAVAILABLE` e não aparecia no despacho; vínculos previamente desativados também podiam bloquear a reativação | `technicians.status` tinha default `UNAVAILABLE`; `resolveDispatchTechnicians` exige técnico ativo, disponível e vínculo Field Service ativo | Criar novos técnicos com `AVAILABLE`, reativar o vínculo ao habilitar e manter `active/status` coerentes na edição administrativa | Implementado no código e migrations aditivas; recuperação segura de vínculos legados em `e13f4be` e correção de habilitação em `341c990`; typecheck, build e suíte completa (111/237) aprovados; homologação remota do registro existente ainda aberta |
| A360-P1-13 | P1 | Formulário permitia submeter chamado sem organização, serviço ou localidade, gerando erro genérico | `ticket-create-flow.tsx` habilitava o envio apenas por cliente; o backend rejeitava o restante pelo schema | Bloquear o envio até que as referências obrigatórias estejam selecionadas e informar o campo pendente | Implementado em `c5b2cad`; testes focados e suíte completa aprovados |
| A360-P1-14 | P1 | Fila de validação podia contar a mesma OS no fluxo Field Service e no legado | `/portal/review` somava `field_service_review_queue` e `tickets.AWAITING_REVIEW` sem deduplicação | Priorizar a fila oficial de OS e separar o legado visualmente | Implementado em `d31fb9e`; teste de UI aprovado |
| A360-P1-16 | P1 | Aprovação da OS podia ser tentada por uma alteração de status sem comprovação de execução persistida | A UI já bloqueava sem submissão, mas a proteção SQL não cobria todos os caminhos de escrita | Exigir submissão parceira ou conclusão interna com execução antes de `APPROVED` | Implementado em migration `20261028154000_field_service_review_submission_guard.sql`, aplicada no Supabase; testes e build aprovados |
| A360-P1-15 | P1 | Destinatários do BM informados com maiúsculas eram rejeitados apesar de o cadastro ser normalizado | `queue-email/route.ts` consultava `billing_recipients` com `.in("email", value.recipients)` antes de comparar sem diferenciar maiúsculas | Normalizar e deduplicar e-mails antes da consulta, validação e gravação do log | Implementado no ciclo atual; teste de rota aprovado |
| A360-P2-01 | P2 | Inventário visual de todas as rotas ainda incompleto | 221 rotas identificadas | Capturar telas por grupo e aplicar tokens por exceção | Aberto |
| A360-P2-02 | P2 | Métricas e dashboards não têm catálogo formal de fórmulas | telas existem, mas fonte/fórmula não está centralizada | Criar catálogo de indicadores auditáveis | Aberto |
| A360-P2-03 | P2 | Ausência de benchmark representativo | nenhum teste de carga executado | Definir volume e medir consultas críticas | Aberto |
| A360-P1-05 | P1 | Lint global falha em legado/demo | `npm run lint`: 2.849 erros e 8.549 avisos | Isolar escopos legados, corrigir por lote e impedir regressões em código produtivo | Aberto |
| A360-P1-08 | P1 | Runtime local precisava seguir CI/Docker | Docker e CI usam Node 20; versão local não estava declarada no repositório | Usar `.nvmrc` e validar com Node 20 | Parcial; `.nvmrc` criado, validação local ainda usa o runtime disponível |
| A360-UI-01 | P1 | Menu demo no mobile deslocava toda a página e usava ícones/fontes inconsistentes | Inspeção visual da fila Field em janela estreita; `demo-sidebar.tsx` e `globals.css` | Abrir como sobreposição, padronizar ícones e marca; testar teclado e larguras adicionais | Parcial; abertura, fechamento externo e Escape verificados; desktop amplo pendente |
| A360-UI-02 | P1 | Chamados tinha barra extensa, comandos demonstrativos, abertura dependente de duplo clique e tabela com rolagem horizontal no mobile | Inspeção visual de `/demo/tickets` e código da barra | Reduzir ações, fornecer abertura explícita e revisar o painel de detalhes | Parcial; barra, clique único e listagem estreita corrigidos; painel com nove abas segue aberto |
| A360-UI-03 | P1 | Agenda, BM e detalhes de Chamados ainda priorizam blocos introdutórios ou múltiplas abas sobre a tarefa | Inspeção visual de `/demo/field-service/routes`, `/finance` e painel do chamado | Redesenhar por decisão operacional, com testes de regressão | Aberto |
| A360-UI-04 | P2 | Login, Dashboard e Cadastros Field têm linguagens visuais distintas | Inspeção visual de `/login`, `/demo` e `/demo/settings/field-service` | Consolidar tokens/componentes e migrar por módulo | Aberto |
| A360-UI-05 | P1 | Filtro de dia de Agenda/Rotas ignorava a data informada | Regex em `portal/routes` e `portal/scheduling` estava escapada como `\\\\d`, fazendo a tela voltar sempre ao dia atual | Corrigir a expressão, cobrir o contrato e validar a seleção de dias distintos | Implementado; teste focado 3/3 e suíte 235/235 aprovados |
| A360-UI-06 | P1 | Horário das paradas de Rotas dependia do fuso do servidor | `toLocaleTimeString` não informava `timeZone`, enquanto o agrupamento já usava São Paulo | Fixar `America/Sao_Paulo` na apresentação e cobrir o contrato | Implementado; validação incluída no teste da agenda/rotas |

## Critério de priorização

Nenhum item deve ser marcado como concluído sem evidência executada, arquivos alterados e teste correspondente.

### Atualização financeira — 2026-10-28

Foi preparada a migration `20261028120000_defer_fiscal_batch_acceptance.sql`. A criação do lote fiscal permanece em `READY` e não marca BMs ou competência como enviados. Essa promoção só ocorre quando o worker registra o e-mail fiscal como `SENT`, com evento por BM e referência ao log do e-mail. A aplicação remota ainda depende de homologação em cópia restaurada.

## Evidência do ciclo de estabilização 2026-10-28

- Suíte automatizada: **106 arquivos / 223 testes aprovados** (`npx vitest run tests`).
- Typecheck: aprovado após os commits `c5b2cad`, `e13f4be` e `a812c59`.
- Produção: `/api/version` confirmou `a812c59`; `/api/ready` retornou `status=ready` e `deploymentMode=supabase`.
- Limitação: ainda não houve execução autenticada real do fluxo completo com registros no Supabase; portanto A360-P1-02 permanece aberto.

## Plano seguro para a migration duplicada A360-P0-06

1. Fazer inventário da tabela de histórico de migrations em cada ambiente (`oneit_system.schema_migrations` ou equivalente), preservando filename e checksum.
2. Confirmar se os dois arquivos `20261024120000_*.sql` foram aplicados e em qual ordem.
3. Em uma cópia restaurada, executar a instalação/upgrade com os dois arquivos e validar funções, constraints, enums e permissões.
4. Definir um baseline versionado para ambientes já existentes; não editar nem renomear arquivos que já tenham sido aplicados.
5. Para ambientes ainda não aplicados, escolher uma convenção de ordenação documentada e registrar o mapeamento no migrador.
6. Executar smoke tests de relatório técnico, transições de BM e readiness após a migração.

O CI executa `npm run audit:migrations:strict` e instalação limpa em Supabase local. Ambos passaram para a revisão `88ca952`; a validação de upgrades em bancos existentes permanece aberta.
