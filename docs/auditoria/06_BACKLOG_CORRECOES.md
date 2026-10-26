# Backlog de correções — auditoria inicial

Status: **execução incremental**. Correções aplicadas somente em lotes pequenos, com validação automatizada; homologação PostgreSQL e deploy Linux continuam pendentes.

| Prioridade | ID / área | Evidência e causa | Impacto / correção proposta | Risco e validação | Status |
|---|---|---|---|---|---|
| P0 | S01 acesso parceiro | `assert_partner_access`: update do contador seguido de exceção na mesma transação | Bloqueio de tentativas provavelmente revertido; implementar limitação persistente na entrada e no banco | Mudança de autenticação; homologar tentativas/concurrency e lock real | Parcial; contador persistente separado em RPC, homologação/concurrency pendente |
| P0 | S02 segredos em URL | Fluxo de parceiro carregava token no query string e o repassava para a página de execução | Exposição em histórico, Referer e logs; reduzir persistência do segredo na URL | Links antigos precisam continuar sendo aceitos durante a transição; ainda requer validação em navegador/proxy | Parcial; novos links usam fragmento e handoff via `sessionStorage`, compatibilidade antiga mantida |
| P0 | A01 perfil de deploy | `requireUser`/`createClient` usam Supabase; `/api/ready` aceita variáveis self-hosted sem verificar dependências | Prontidão declarada pode divergir do funcionamento; escolher e integrar perfil único | Mudança arquitetural; aprovação, homologação e rollback | Parcial; readiness agora valida formato de URLs/DSN, mas o runtime self-hosted ainda não está integrado |
| P0 | F01 persistência | `demo/field-service/finance` e `fiscal` usam `localStorage` para ciclo | Registro local não é medição imutável nem envio; conectar fluxo real ao backend | Migração e UX; teste fim a fim e dupla conferência | Aberto |
| P0 | D01 grants/RLS | Migrator self-hosted concede CRUD/execute amplos | Risco potencial de bypass conforme role/RLS; inventariar e minimizar privilégios | Pode afetar operações; testes A/B por perfil em banco real | Aberto; exploração não confirmada |
| P1 | F02 log de envio | API `fiscal/email-log` aceitava `SENT` do cliente | Risco de registro sem comprovação; restringir conclusão ao worker e validar grants | Compatibilidade do fluxo financeiro; teste direto e de provedor | Parcial; cliente só enfileira, worker confirma, homologação pendente |
| P0 | F03 fechamento sem envio | `transition_measurement_sheet` registrava `final_email_sent_at` em `CLOSED` sem verificar o log ou o provedor | Fechamento podia declarar envio não comprovado; vincular confirmação ao registro correto e distinguir envio de entrega | Mudança transacional de faturamento; requer aprovação e testes com falha/concurrency | Parcial; exige log FISCAL `SENT`, homologação pendente |
| P0 | D02 enum e migrations | Migration `20261024120000` adiciona e usa enum no mesmo arquivo; migrator encapsula cada arquivo numa transação | Instalação limpa pode falhar; testar em PostgreSQL e planejar migração compatível com checksums existentes | Não editar migration aplicada sem estratégia; teste de instalação e atualização em cópia | Aberto; risco não executado |
| P1 | F04 worker financeiro | `sendBillingEmail` não tem chamadas em `src` ou `scripts`; há endpoints de claim/result | Envio automático não está comprovado; inventariar worker externo e integrar de modo confiável | Pode envolver infraestrutura externa; testar anexos, falhas, retentativas e idempotência | Aberto |
| P1 | O01 redistribuição | Migração `20261024140000` não integrada/homologada | Recusa pode deixar OS sem próximo responsável; integrar rota, auditoria, revogação e fila | Concorrência e histórico; testes transacionais/usuário | Parcial; contrato coberto, homologação pendente |
| P1 | Q01 releases | 149 migrations e árvore com arquivos não rastreados; estado real desconhecido | Risco de deploy incompleto; inventariar checksums, baseline e estado aprovado | Não alterar dados; restauração e teste de upgrade em cópia | Aberto |
| P2 | P01 paginação | listas de OS/rotas sem limites em `portal/service-orders` e `portal/routes` | Risco de crescimento; medir e paginar | Mudança de navegação; testes de paginação e índices | Parcial; limites máximos aplicados, paginação por cursor ainda pendente |
| P2 | U01 produto demo vs real | raiz aponta `/demo`; vários estados são locais | Confusão operacional; identificar claramente ambiente e consolidar telas | Fluxo de usuários; teste de usabilidade | Aberto |
| P1 | R03 perfil de runtime | CI usava Node 24, Docker usa Node 20; Supabase e `self_hosted` aparecem misturados | Builds e comportamento podem divergir entre ambientes | Definir versão suportada, alinhar CI/Docker e validar build Linux | Parcial; CI alinhado ao Node 20 e passou a validar o build do container; falta homologar execução Linux/VPS |
| P1 | R04 release configuration | Compose dependia de `.env.production` sem validação automatizada de variáveis obrigatórias | VPS podia iniciar parcialmente configurada | Criar procedimento/checagem de configuração antes do deploy | Parcial; `npm run check:production-env` e `deploy/preflight.sh` criados; ainda falta execução em uma VPS real |
| P2 | Q02 lint legado | Lint global registra 2.849 erros e 8.549 avisos, sobretudo em telas demo/legadas | Dificulta evolução e pode esconder regressões fora dos escopos críticos | Corrigir por domínio, começando por telas ainda expostas, sem aplicar autofix global | Aberto |

## Ordem proposta

S0: evidência de ambientes e bloqueio de exposição de demonstração. S1: identidade, isolamento e link de parceiro. S2: chamado/OS/redistribuição e evidências. S3: BM/fiscal e rastreabilidade de entrega. S4: testes integrados, desempenho, backup e ensaio de deploy. Não executar mudanças estruturais sem aprovação do plano e preparação de homologação.

## Atualização de execução — concorrência na validação

O risco de aprovação da fila após alteração concorrente da OS foi tratado na migration `20261025130000_field_service_review_concurrency.sql`. A decisão agora exige status `COMPLETED`, mesma organização e atualização efetiva de uma fila ainda `PENDING`; caso contrário, a transação falha sem aprovação parcial. A validação automatizada passou com **63 arquivos e 131 testes**. A aplicação em banco de homologação continua pendente.

### Autorização de usuário ativo no RTO

A migration `20261025140000_field_service_rto_active_actor.sql` reforça as funções de geração e registro do arquivo: além do papel organizacional, o perfil autenticado precisa estar ativo. Foram adicionados testes de contrato e a verificação TypeScript passou. A aplicação e o teste integrado em Supabase permanecem pendentes.

### Integridade multiempresa da fila de validação

A migration `20261025150000_field_service_review_org_integrity.sql` adiciona trigger que confere a organização da OS e do chamado antes de inserir ou alterar a fila. Vínculos cruzados passam a falhar com `FIELD_REVIEW_ORGANIZATION_MISMATCH`, preservando o isolamento entre organizações. Quatro testes direcionados e TypeScript passaram; a confirmação final depende de PostgreSQL de homologação.

### Bloqueio de atualização direta da fila

A migration `20261025160000_field_service_review_no_direct_update.sql` remove a política ampla de `UPDATE` da fila e revoga esse privilégio de `authenticated`. Aprovação e devolução continuam disponíveis pelas funções transacionais, que aplicam lock e gravam auditoria. Quatro testes direcionados e TypeScript passaram; validar grants efetivos em homologação continua pendente.

A migration `20261025170000_field_service_review_no_direct_mutation.sql` também revoga `INSERT` e `DELETE` diretos para usuários autenticados. A fila passa a ser criada pelo trigger e modificada somente pelas RPCs. Regressão completa posterior: **68 arquivos e 137 testes aprovados**.

A migration `20261025180000_field_service_review_submission_integrity.sql` reforça o vínculo das evidências: quando existe `submission_id`, a submissão é resolvida pelo acesso do parceiro e precisa apontar para a mesma OS da fila. TypeScript e três testes direcionados passaram; falta confirmar em PostgreSQL de homologação.

A persistência das tentativas inválidas do acesso parceiro foi reforçada pela migration `20261025210000_partner_access_failure_persistence.sql`. A rota chama `record_partner_access_failure` em uma transação separada somente quando o token/código é inválido; o contador é limitado a cinco tentativas e não é incrementado para acessos expirados ou já bloqueados. ESLint e testes direcionados passaram; a confirmação de grants, concorrência e comportamento efetivo depende de PostgreSQL de homologação.

A tela mobile do técnico foi ajustada para impedir duplo envio durante eventos de aceite, deslocamento, check-in, salvamento e checkout; os botões exibem estado de processamento. O endereço agora oferece rota no Waze e a sequência de ações permanece condicionada ao status atual. ESLint e cinco testes direcionados passaram; ainda falta teste E2E em dispositivo móvel e conexão real.

A coleta de evidências foi refinada com ações separadas para galeria e câmera (`capture=environment`), filtros de JPG/PNG/WebP, limite de 8 imagens e 10 MB por arquivo. A validação do cliente evita envio de formatos inválidos; o backend continua sendo a autoridade final.

Risco P1 identificado na revisão de retries: a função `submit_partner_service_order_event` aceita `SUBMIT` em `CHECKED_IN` e `IN_SERVICE`. Um retry após timeout pode inserir uma segunda submissão antes do checkout. Correção recomendada: idempotência por evento/chave de acesso ou restringir `SUBMIT` a `CHECKED_IN`, com migration e teste concorrente em PostgreSQL antes de alterar o contrato.

Mitigação aplicada no mobile: quando o `SUBMIT` sofre timeout, a tela consulta o contexto da OS; se o backend já estiver em `IN_SERVICE`, a operação é tratada como concluída localmente e o técnico segue para checkout. Isso reduz reenvios acidentais, mas não substitui idempotência transacional no banco.

Gap funcional confirmado na revisão mobile: a tela do técnico ainda não lança materiais/LPU. O banco atual restringe `add_field_service_order_lpu_line` a gestor e aceita a OS somente em `COMPLETED/VALIDATED`; portanto não foi criado um formulário enganoso no mobile. Próxima tarefa: definir se o técnico informa consumo (catálogo LPU + quantidade) e o gestor apenas valida, ou se o lançamento permanece exclusivamente na validação.

A migration `20261025190000_field_service_rto_file_immutability.sql` impede substituir o caminho ou hash de um PDF de RTO já registrado. Reenvio idêntico permanece idempotente; qualquer divergência retorna `RTO_FILE_ALREADY_REGISTERED`. TypeScript e dois testes direcionados passaram.

O endpoint `GET /api/field-service/rto` agora registra `FIELD_SERVICE_RTO_VIEWED` com usuário, OS e modo de acesso antes de devolver a URL assinada. A falha do log não interrompe o download, evitando indisponibilidade por auditoria; a escrita real deve ser confirmada em homologação. TypeScript e dois testes direcionados passaram.

A devolução da fila de validação foi corrigida na migration `20261025195000_field_service_review_return_to_correction.sql`: a OS retorna a `IN_SERVICE`, registra evento de retorno e pode ser submetida novamente pelo técnico. A tela de revisão passou a exibir justificativa e data das OS devolvidas. Regressão completa: **71 arquivos e 141 testes aprovados**.

O compartilhamento via WhatsApp foi endurecido: telefone inválido é recusado, links locais não são compartilhados e o histórico registra apenas mensagem preparada, não entrega. Testes direcionados e ESLint passaram.

As listas operacionais do portal passaram a ter limites explícitos: 200 técnicos/rotas/OS na fila principal, 500 OS candidatas e 1.000 paradas. Isso evita carregamento ilimitado; a paginação por cursor permanece planejada para volumes maiores.

Também foram limitadas a 500 linhas as filas gerais de chamados e de agendamento. O conjunto de contratos de paginação/limites agora cobre **4/4 testes**; cursor e filtros persistidos continuam como evolução posterior.

O endpoint público de log financeiro agora aceita somente `QUEUED`. Os estados `SENT` e `FAILED` ficam reservados ao endpoint interno autenticado por segredo do worker, que chama as RPCs de conclusão/falha. Testes direcionados: **2/2 aprovados**.

O fechamento `CLOSED` da medição agora exige um registro vinculado de e-mail fiscal com `status = SENT` e `sent_at` preenchido. Sem confirmação do worker, a transação falha com `measurement_final_email_not_confirmed`.
