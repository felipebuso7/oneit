# Backlog consolidado da auditoria 360°

| ID | Prioridade | Achado | Evidência | Próxima ação | Estado |
|---|---|---|---|---|---|
| A360-P0-01 | P0 | Grants/RLS e migrations não homologados em PostgreSQL real | 162 migrations; auditoria anterior registra validação pendente | Restaurar cópia segura e testar instalação/upgrade | Aberto |
| A360-P0-06 | P0 | Duas migrations compartilham o mesmo prefixo temporal `20261024120000` | `billing_final_fiscal_workflow.sql` e `report_evidence_paths.sql` | Não renomear migration aplicada; validar ordem/checksum em cópia e criar estratégia de baseline/upgrade | Aberto |
| A360-P0-07 | P0 | Policies financeiras não impedem forjar envio/estado por inserção ou alteração direta se as tabelas estiverem expostas ao cliente autenticado | `billing_email_log` aceita insert para gestores sem condição sobre `status`; `fiscal_batches` usa policy `FOR ALL` | Verificar grants reais com `npm run audit:billing-db`, preparar migração nova para reservar status de envio ao worker e transições ao RPC; testar privilégios em PostgreSQL restaurado | Aberto; auditor somente leitura criado, sem conexão de banco neste ciclo |
| A360-P1-07 | P1 | Migrations adicionam valores a enum enquanto o migrador envolve cada arquivo em transação | `20261017100000_sgsti_four_eyes_enum.sql` e `20261024120000_billing_final_fiscal_workflow.sql` usam `ALTER TYPE ... ADD VALUE` | Confirmar versão PostgreSQL suportada e executar instalação/upgrade em cópia; não alterar migrations aplicadas sem plano | Aberto |
| A360-P0-02 | P0 | Separação entre demo/localStorage e produção precisa ser explícita | 76 páginas demo; 7 não usam `DemoSidebar`: inventário, portal solicitante, detalhe de solicitação, técnico e parceiro | Adicionar banner discreto específico para essas superfícies móveis/standalone | Parcial; cobertura identificada, correção visual ainda pendente |
| A360-P1-01 | P1 | Worker financeiro não comprovado | endpoints claim/result existem, chamadas de worker não encontradas em `src`/`scripts` | Definir executor, retry, idempotência e homologar provedor | Aberto |
| A360-P1-02 | P1 | Jornada Field Service real não homologada | contratos automatizados existem; mapa, agenda e dispositivo real não testados | Executar cenário E2E em ambiente isolado | Aberto |
| A360-P1-03 | P1 | OAuth/e-mail e WhatsApp não têm prova de provedor real | somente contratos e abertura de conversa foram testados | Configurar sandbox e registrar evidência de envio/erro | Aberto |
| A360-P1-09 | P1 | BM/fiscal demonstrativos não enviam e-mail nem bloqueiam competência no servidor | `finance/page.tsx` e `fiscal/page.tsx` apenas mudavam `localStorage`, mas gravavam `emailSentAt`, `finalEmailSentAt` e `immutableAt` | Conectar fluxo autenticado à fila e ao worker de e-mail, validar destinatários/versão/anexo, aguardar aceitação do provedor e só então liberar encerramento fiscal transacional | Parcial; UI identifica simulação e a fila agora valida contexto/versão, mas envio real e bloqueio permanecem abertos |
| A360-P1-10 | P1 | Fechamento fiscal exige log `SENT` por BM, mas e-mail fiscal é enfileirado só por lote | `20261025200000_measurement_close_requires_sent_email.sql` exige `measurement_sheet_id`; `queue-email/route.ts` grava `fiscal_batch_id` sem BM | Definir vínculo lote–BMs para comprovação de envio e fechamento, corrigir em migração nova e testar lote com vários BMs em banco restaurado | Aberto; impedimento documentado em `19_FILA_EMAIL_VALIDACAO_CONTEXT.md` |
| A360-P1-11 | P1 | Transição `SENT_FOR_CONTESTATION` registra horário de envio antes de comprovação do provedor | `20261025200000_measurement_close_requires_sent_email.sql` grava `sent_to_customer_at` diretamente | Condicionar registro de envio à confirmação do worker e distinguir fila, aceite e entrega quando houver evidência | Aberto; sem migração neste ciclo |
| A360-P1-04 | P1 | RLS/escopo por organização não validado em banco | regras existem no código/migrations; sem execução real | Testar matriz de acesso com duas organizações | Aberto |
| A360-P2-01 | P2 | Inventário visual de todas as rotas ainda incompleto | 221 rotas identificadas | Capturar telas por grupo e aplicar tokens por exceção | Aberto |
| A360-P2-02 | P2 | Métricas e dashboards não têm catálogo formal de fórmulas | telas existem, mas fonte/fórmula não está centralizada | Criar catálogo de indicadores auditáveis | Aberto |
| A360-P2-03 | P2 | Ausência de benchmark representativo | nenhum teste de carga executado | Definir volume e medir consultas críticas | Aberto |
| A360-P1-05 | P1 | Lint global falha em legado/demo | `npm run lint`: 2.849 erros e 8.549 avisos | Isolar escopos legados, corrigir por lote e impedir regressões em código produtivo | Aberto |
| A360-P1-08 | P1 | Runtime local precisava seguir CI/Docker | Docker e CI usam Node 20; versão local não estava declarada no repositório | Usar `.nvmrc` e validar com Node 20 | Parcial; `.nvmrc` criado, validação local ainda usa o runtime disponível |
| A360-UI-01 | P1 | Menu demo no mobile deslocava toda a página e usava ícones/fontes inconsistentes | Inspeção visual da fila Field em janela estreita; `demo-sidebar.tsx` e `globals.css` | Abrir como sobreposição, padronizar ícones e marca; testar teclado e larguras adicionais | Parcial; abertura, fechamento externo e Escape verificados; desktop amplo pendente |
| A360-UI-02 | P1 | Chamados tinha barra extensa, comandos demonstrativos, abertura dependente de duplo clique e tabela com rolagem horizontal no mobile | Inspeção visual de `/demo/tickets` e código da barra | Reduzir ações, fornecer abertura explícita e revisar o painel de detalhes | Parcial; barra, clique único e listagem estreita corrigidos; painel com nove abas segue aberto |
| A360-UI-03 | P1 | Agenda, BM e detalhes de Chamados ainda priorizam blocos introdutórios ou múltiplas abas sobre a tarefa | Inspeção visual de `/demo/field-service/routes`, `/finance` e painel do chamado | Redesenhar por decisão operacional, com testes de regressão | Aberto |
| A360-UI-04 | P2 | Login, Dashboard e Cadastros Field têm linguagens visuais distintas | Inspeção visual de `/login`, `/demo` e `/demo/settings/field-service` | Consolidar tokens/componentes e migrar por módulo | Aberto |

## Critério de priorização

Nenhum item deve ser marcado como concluído sem evidência executada, arquivos alterados e teste correspondente.

## Plano seguro para a migration duplicada A360-P0-06

1. Fazer inventário da tabela de histórico de migrations em cada ambiente (`oneit_system.schema_migrations` ou equivalente), preservando filename e checksum.
2. Confirmar se os dois arquivos `20261024120000_*.sql` foram aplicados e em qual ordem.
3. Em uma cópia restaurada, executar a instalação/upgrade com os dois arquivos e validar funções, constraints, enums e permissões.
4. Definir um baseline versionado para ambientes já existentes; não editar nem renomear arquivos que já tenham sido aplicados.
5. Para ambientes ainda não aplicados, escolher uma convenção de ordenação documentada e registrar o mapeamento no migrador.
6. Executar smoke tests de relatório técnico, transições de BM e readiness após a migração.

O CI agora executa `npm run audit:migrations:strict`, que falha enquanto houver prefixo duplicado ou operação destrutiva detectada. A falha atual é intencional e permanece aberta até a validação do histórico real do banco.
