# Relatório de validação — 2026-10-24

## Executado nesta etapa

- `npm run typecheck`: passou (código 0).
- `npm test`: passou, 54 arquivos e 117 testes. Parte dos testes verifica texto/contratos de código; isso não prova migrations, RLS, UX nem execução ponta a ponta.
- `npm run lint`: iniciado e interrompido após execução prolongada sem resultado; não pode ser classificado como aprovado ou reprovado.
- Leitura estática de configurações, autenticação, amostra de migrations, despacho, acesso parceiro, financeiro e implantação. Achados e limites em documentos 01–06.
- `npm ls --depth=0`: código 0; a instalação local lista pacotes extras como `extraneous`. Isso não é uma auditoria de vulnerabilidades nem prova que `npm ci` ou build limpo funcionem.
- Revisão complementar de políticas de `billing_email_log`, transições de competência, migração de enum e referências ao provider de e-mail. Não houve chamadas reais ao provedor nem execução SQL.

## Não executado / não comprovado

- Não foi conectada uma instância PostgreSQL/Supabase para conferir schema, migrations aplicadas, dados, isolamento A/B, grants, planos de consulta ou concorrência.
- Não foi executado ciclo real pelo navegador, celular, WhatsApp, provedor de e-mail, Google Sheets, assinatura, RTO ou BM.
- Não foram executados build e inicialização Linux/Docker nesta etapa, carga, benchmark, pentest, backup/restauração ou deploy.
- Não foi feita auditoria exaustiva de todas as 500 unidades de código, APIs, 149 migrations ou telas. Esta é uma primeira entrega de diagnóstico, não a conclusão das dez fases.

## Rodada de estabilização — 2026-10-25

- `npx tsc --noEmit`: passou (código 0).
- `npm test`: passou novamente, **62 arquivos e 129 testes**.
- `npm run build`: não foi validado. O Next.js iniciou a compilação, mas o Windows retornou `EPERM` ao criar diretórios dinâmicos dentro de `.next` (`api/field-service` e, em tentativa isolada, `api/sgsti/master-plan/tasks`). A falha foi reproduzida com dois diretórios de saída distintos e não apresentou diagnóstico de TypeScript/Webpack do código.
- Não foram removidos diretórios, encerrados processos ou alterados dados para contornar o bloqueio. O build deve ser repetido em ambiente Linux/CI ou após liberar a restrição de filesystem do ambiente local.

Conclusão desta rodada: os testes automatizados e a verificação estática permanecem verdes; a prontidão de produção continua **não comprovada** até executar build limpo, migrations, storage e fluxo integrado em homologação.

Regressão posterior às correções de autorização, integridade e auditoria do RTO: **71 arquivos e 140 testes aprovados**. O resultado continua sendo validação automatizada; não comprova execução SQL, storage ou provedor externo.

## Lint — 2026-10-25

`npm run lint` foi executado e falhou com **2.858 erros e 8.555 avisos**, distribuídos por uma grande quantidade de código legado/demo e arquivos fora do escopo desta sprint. O lint isolado dos arquivos alterados na proteção do RTO passou sem erros. Não foi aplicado `eslint --fix` global, pois a alteração em massa poderia introduzir regressões; o débito deve ser tratado por lotes, começando pelos módulos de produção.

### Correção de concorrência — revisão de OS

Foi adicionada a migration `20261025130000_field_service_review_concurrency.sql`. A aprovação agora exige que a OS ainda esteja `COMPLETED` na mesma organização, verifica a quantidade de linhas afetadas e só então altera a fila `PENDING`. Mudanças concorrentes ou estados divergentes retornam erro explícito, sem marcar a fila como aprovada.

Validação: `npx tsc --noEmit` e 5 testes direcionados passaram. A execução SQL em PostgreSQL/Supabase ainda depende de ambiente de homologação.

O primeiro lote de qualidade também foi verificado: `src/components/field-service/**/*.tsx` e `src/lib/field-service/**/*.ts` passaram no ESLint sem erros ou avisos. Isso reduz o risco do módulo Field Service, mas não elimina o débito existente no restante do repositório.

Segundo lote verificado: `src/app/api/field-service/**/*.ts` e `src/domain/reports/**/*.ts` passaram no ESLint sem erros ou avisos.

Terceiro lote verificado: autenticação, Supabase, proxy e endpoints de health/readiness (`src/lib/auth`, `src/lib/supabase`, `src/proxy.ts`, `/api/ready` e `/api/health`) passaram no ESLint sem erros ou avisos.

Quarto lote: as páginas de revisão/RTO e Field Service passaram no lint após documentar a exceção necessária para assinatura em data URL privada. TypeScript também passou.

Quinto lote: APIs de BM/fiscal, transição de competência e worker interno de e-mail (`src/app/api/field-service/fiscal`, `measurement` e `src/app/api/internal/billing-email`) passaram no ESLint sem erros ou avisos.

Sexto lote: telas demonstrativas de medição, fiscal, histórico e financeiro tinham um erro de `setState` síncrono em `useEffect`. A leitura local foi tornada assíncrona com limpeza do timer; lint e TypeScript passaram nesse conjunto.

Sétimo lote: o menu lateral do portal também tinha atualização síncrona de estado ao ler a preferência local. A leitura foi tornada assíncrona com cleanup; layout, autenticação e componentes compartilhados passaram no ESLint e TypeScript.

Verificação consolidada posterior: todos os componentes compartilhados, layout do portal e telas de autenticação continuam sem erros no ESLint; TypeScript passou novamente.

Regressão após o ajuste de medição: **71 arquivos e 140 testes aprovados**.

Oitavo lote: telas demonstrativas de mudanças e evidências tiveram os carregamentos de `localStorage` ajustados para execução assíncrona com cleanup. O uso de `<img>` para data URLs locais foi documentado como exceção. ESLint isolado passou sem erros ou avisos.

Nono lote: planejamento de rotas, cadastro de LPU e composição de preços tiveram o mesmo ajuste de carregamento assíncrono. ESLint e TypeScript passaram nesses três módulos.

Décimo lote: a tela demonstrativa do técnico teve os efeitos de conectividade e carregamento da visita ajustados para execução assíncrona, e foi removida uma função sem uso. Os erros de React Hooks foram eliminados; permanece apenas um aviso de dependência de efeito que deve ser revisado em uma etapa específica de refatoração.

Décimo primeiro lote: despacho e central Field Service tiveram dependências de hooks revisadas. A dependência desnecessária foi removida e a abertura contextual do painel foi documentada como exceção controlada. ESLint e TypeScript passaram.

Verificação consolidada: todas as telas `src/app/demo/field-service/**/*.tsx` passaram no ESLint sem erros ou avisos.

Regressão final deste ciclo: `npx tsc --noEmit` e `npm test` passaram; **71 arquivos e 140 testes aprovados**.

O workflow de CI foi ajustado para executar `lint:stabilization` e o novo `lint:field-service`, evitando que o débito legado do lint global impeça a validação dos módulos prioritários. Ambos os comandos passaram localmente.

O script `verify` foi alinhado ao mesmo critério segmentado. Lint de estabilização, lint do Field Service e TypeScript passaram localmente; o build continua sujeito ao bloqueio `EPERM` já documentado no Windows.

Execução de `npm run verify`: lint de estabilização, lint Field Service, lint core UI, lint financeiro, TypeScript e **71/140 testes** passaram. A etapa final de build falhou novamente com `EPERM` ao criar diretório dinâmico do Next.js em `api/field-service/fiscal/batch/[id]/summary`; o bloqueio permanece ambiental e foi reproduzido no fluxo oficial.

Foi adicionado o lote `lint:core-ui` para layout do portal, autenticação e componentes compartilhados, também incluído no CI e no `verify`. Execução local aprovada.

Foi adicionado o lote `lint:finance` para APIs fiscais, medição, worker de e-mail e telas financeiras; ele também está no CI e no `verify`. Execução local aprovada.

Décimo segundo lote: componentes e domínio de chamados (`src/components/tickets`, `src/domain/tickets` e APIs de revisão/fechamento) passaram no ESLint sem erros ou avisos. A camada de entrada do fluxo de chamados permanece apta para a próxima validação funcional integrada com despacho Field Service.

Regressão direcionada após esse lote: suíte Vitest completa aprovada (**71 arquivos / 140 testes**). Isso confirma os contratos automatizados atuais, mas não substitui teste manual autenticado nem execução contra Supabase de homologação.

O contrato de despacho atômico também foi reforçado para cobrir atribuição do técnico, incremento otimista de versão e prevenção de OS duplicada. Teste isolado: **2/2 aprovados**, lint do teste aprovado.

O contrato mobile/parceiro foi ampliado para verificar a sequência `TRAVEL_STARTED → CHECK_IN → SUBMIT → CHECK_OUT`, exigindo submissão técnica antes do checkout e conclusão da OS somente na última etapa. Teste isolado: **2/2 aprovados**, lint aprovado.

Correção de fluxo aplicada: uma devolução da validação não deixa mais a OS presa em `COMPLETED`. A função de revisão agora retorna a OS para `IN_SERVICE`, registra evento/auditoria e permite nova submissão técnica. Cobertura: **3/3 testes aprovados**.

A fila gerencial foi alinhada a esse comportamento: a tela agora exibe separadamente as OS devolvidas, a justificativa e a data da decisão, sem oferecer ações de aprovação para registros já decididos. ESLint da página e teste de revisão passaram.

Regressão do lote de validação: TypeScript, ESLint da página/API e **6/6 testes** de revisão (API, integridade e concorrência) passaram.

Comunicação do despacho revisada: o fluxo normaliza o telefone brasileiro, recusa números inválidos, bloqueia links locais para compartilhamento externo, codifica a mensagem e registra apenas “mensagem preparada”, sem afirmar entrega pelo WhatsApp. Testes de compartilhamento: **4/4 aprovados** e ESLint aprovado.

Regressão consolidada após as alterações de revisão e comunicação: TypeScript, ESLint dos arquivos alterados e suíte completa passaram; resultado atual **71 arquivos / 141 testes aprovados**.

O backlog de correções foi sincronizado com o estado real da implementação: itens de revisão, devolução e compartilhamento agora aparecem como parciais/concluídos, sempre com a ressalva de que PostgreSQL de homologação e deploy Linux ainda não foram executados neste ambiente.

O risco de carregamento ilimitado das filas de ordens e rotas foi reduzido com limites explícitos nas consultas do portal. Teste de contrato: **2/2 aprovados**; ESLint das duas páginas aprovado. Paginação por cursor continua como melhoria posterior.

As filas gerais de chamados e de agendamento receberam limite adicional de 500 registros. Contratos combinados de desempenho: **4/4 testes aprovados** e ESLint aprovado.

Headers básicos de segurança foram aplicados globalmente pelo Next (`Referrer-Policy: no-referrer`, `X-Frame-Options: DENY` e `X-Content-Type-Options: nosniff`). TypeScript, ESLint e teste de contrato passaram.

O log financeiro foi endurecido: o endpoint autenticado do usuário só aceita criar registros `QUEUED`; confirmação `SENT`/`FAILED` permanece no endpoint interno do worker. ESLint e **2/2 testes** passaram. A confirmação em provedor real e grants PostgreSQL continuam pendentes.

O fechamento da medição foi protegido contra envio não comprovado por nova migration: só fecha quando existe log fiscal vinculado, com `SENT` e `sent_at`. Testes de contrato financeiro: **3/3 aprovados**; aplicação em PostgreSQL de homologação ainda pendente.

O bloqueio de tentativas inválidas do acesso parceiro foi reforçado com a RPC `record_partner_access_failure`, chamada fora da transação que devolve o erro de autenticação. O teste direcionado de persistência e o ESLint da rota passaram; ainda não foi possível validar grants, concorrência e lock contra um PostgreSQL/Supabase de homologação.

No fluxo de despacho, novos links do parceiro passaram a transportar o token no fragmento (`#token=...`), que não é enviado em requisições HTTP, e o código/token são entregues à tela seguinte por `sessionStorage`; a execução remove o handoff após leitura. ESLint e 3 testes direcionados passaram. Links legados com query string continuam aceitos por compatibilidade e devem ser retirados após a janela de migração.

O readiness check deixou de tratar qualquer texto como configuração válida: URLs públicas, emissor de autenticação e endpoint S3 precisam usar `http/https`, o banco self-hosted precisa ter DSN PostgreSQL/MySQL/MariaDB e identificadores não podem ser vazios. ESLint e 5 testes direcionados passaram. Isso melhora a detecção de configuração inválida, mas não substitui um probe real das dependências.

Na tela de execução do técnico, os eventos críticos agora têm proteção contra duplo clique e feedback de processamento; o endereço apresenta abertura de rota no Waze. O fluxo de aceite, deslocamento, check-in, execução, assinatura e checkout foi validado por ESLint e cinco testes direcionados. Não foi executado teste E2E em celular nem fluxo integrado contra o backend de homologação nesta rodada.

A coleta de fotos agora oferece galeria e câmera separadamente, com limite de oito imagens e 10 MB por arquivo no cliente. O teste direcionado do fluxo do parceiro permaneceu aprovado; câmera real, permissões do dispositivo e upload contra storage de homologação continuam pendentes.

Auditoria funcional: não há atualmente campo de materiais/LPU na tela do técnico. Isso é coerente com a regra existente de backend, que permite aplicar linhas LPU somente ao gestor após a OS concluída; é uma lacuna de produto, não um erro silencioso da interface. A decisão de permitir pré-lançamento pelo técnico deve preceder qualquer alteração de permissão ou schema.

Após timeout no envio do atendimento, o mobile agora consulta o estado da OS e reconhece `IN_SERVICE` como envio já processado, evitando que o técnico repita a ação por engano. ESLint e cinco testes direcionados passaram; idempotência definitiva no banco continua pendente.

Regressão completa após a proteção de fechamento: TypeScript, ESLint financeiro e **76 arquivos / 148 testes aprovados**.

A API de transição agora traduz a nova regra para `409 FINAL_EMAIL_NOT_CONFIRMED`, permitindo feedback operacional específico em vez de erro genérico. ESLint e **2/2 testes** direcionados passaram.

Regressão completa final deste lote: **77 arquivos e 149 testes aprovados**.

Regressão financeira após a alteração: TypeScript e ESLint passaram; **6/6 testes** de log, idempotência, auditoria, workflow fiscal e bloqueio final passaram.

## Critério para concluir

Revisar todos os módulos prioritários e dados reais de homologação; executar testes de integração/segurança e fluxo operacional; registrar correções e evidências por etapa; repetir build, infraestrutura e recuperação em Linux. Não inferir aptidão de produção apenas a partir de testes unitários ou compilação.

## Validação Sprint A — 25/10/2026

- `npm run typecheck`: aprovado (`tsc --noEmit`).
- `npm test -- --run`: aprovado — **78 arquivos / 150 testes**.
- Nenhuma migration foi executada contra banco externo nesta rodada.
- Nenhum provedor de e-mail, navegador autenticado, dispositivo móvel ou VPS Linux foi utilizado.
- A evidência permanece limitada a testes estáticos/automatizados; não altera a classificação de prontidão para produção.
- `npm run lint:stabilization` e `npm run lint:field-service`: aprovados sem saída de erro.
- `npm run lint:core-ui` e `npm run lint:finance`: aprovados sem saída de erro.
- `npm run lint` global: reprovado com **2.849 erros e 8.549 avisos** (11.398 problemas), concentrados principalmente em telas demo/legadas. Por isso o pipeline de release usa lintes escopados; isso não deve ser confundido com qualidade global resolvida.
- `npm run build`: não concluído neste Windows; o Next falhou ao criar `.next/server/app/api/administration/users` com `EPERM`. Isso é uma limitação/lock de filesystem do ambiente atual e ainda precisa ser reproduzido em Linux/CI antes de classificar como falha da aplicação.
- Docker não está disponível neste ambiente (`docker` não encontrado); a imagem e o `compose.vps.yml` ainda não foram executados localmente.

## Regressão UI/UX — ciclo atual

- `npm test -- --run`: aprovado — **78 arquivos / 150 testes**.
- `npm run typecheck`: aprovado após os ajustes de LPU, Field Service, Dashboard, portal e sidebar.
- ESLint direcionado dos arquivos alterados: aprovado.
- Não foram executados testes visuais automatizados nem navegação autenticada contra Supabase nesta
  rodada; a validação visual em navegador continua pendente.
- Regressão consolidada após os últimos ajustes de autenticação, portal, Dashboard e sidebar:
  **78 arquivos / 150 testes aprovados**.
- Nova regressão após a padronização das filas de Chamados, Ordens de Serviço e do detalhe do
  chamado: **78 arquivos / 150 testes aprovados**.
- `npm run lint:core-ui`: aprovado após os ajustes de autenticação, sidebar e componentes compartilhados.
### Validação complementar — 25/10/2026

- `npm run lint:finance`: aprovado.
- `npm run lint:stabilization`: aprovado.
- Os dois escopos foram executados após o diagnóstico do ambiente local; não foram identificadas regressões de lint nos módulos financeiros, fiscais, BM, readiness e relatórios.
- O preflight de produção passou a ter dois testes automatizados: rejeição de ambiente incompleto e aprovação da configuração mínima válida.
