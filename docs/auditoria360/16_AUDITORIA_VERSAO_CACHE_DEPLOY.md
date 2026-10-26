# Auditoria de versão, cache e rotas — ciclo inicial

Data da verificação: 25/10/2026. Ambiente: notebook local, `127.0.0.1:3000`.

## Diagnóstico antes das mudanças

| Item | Evidência | Classificação |
| --- | --- | --- |
| Projeto e Git | `C:/Users/felipe.buso_tothetop/Desktop/Codex/servicia-fsm`, branch `main`, HEAD `f14d083` (commit inicial de 30/09). Grande parte de `src/app/demo`, componentes e docs está **não rastreada** no Git; há alterações em arquivos rastreados. | Comprovado |
| Processo local | `127.0.0.1:3000` atendido por `node.exe` PID 13376, iniciado em 25/10 às 17:05, com comando `node_modules/next/dist/server/lib/start-server.js`. HTTP da fila nova: 200, `Cache-Control: must-revalidate, no-cache`. | Comprovado |
| Código servido | `/demo/field-service/queue-v2` apresenta “Fila Field Service”; `/demo/field-service/queue` apresenta “Fila de atendimento”. Ambas respondem 200 no **mesmo processo**. `/demo/field-service/validation` apresenta “Validação administrativa”, enquanto `validation-v2` tem implementação nova. | Comprovado |
| Entrada pelo Dashboard | `src/app/demo/page.tsx` aponta “Abrir agenda de campo” para `/demo/field-service`, implementação grande/legada da gestão, enquanto o menu aponta para `queue-v2` e `validation-v2`. | Comprovado |
| Service Worker | `PwaStatus` registra `/sw.js` apenas com `NODE_ENV=production`. O SW atual guarda somente `/offline.html` e `/offline-app.js`; navegações usam rede e só caem no shell offline em erro. Não há evidência de cache de HTML pelo SW atual no desenvolvimento local. | Comprovado no código; estado de SW instalado anteriormente no navegador ainda não inspecionado |
| Dados demonstrativos | Fila e central usam `oneit.demo.field-visits.v1` em `localStorage`, que é separado por origem. `localhost:3000` e `127.0.0.1:3000` podem apresentar registros diferentes. Isto explica **diferença de dados**, não a tela antiga em uma mesma rota. | Comprovado no código; conteúdo real do navegador não inspecionado |
| Banco | `src/app/demo/field-service/queue-v2/page.tsx` lê a fila do `localStorage`; não consulta banco. Há APIs Supabase em outros fluxos, mas a tela auditada não depende delas para listar OS. | Comprovado |
| Docker/CDN | Há `Dockerfile` e `compose.vps.yml`, mas o processo local identificado é Node/Next direto. Nenhuma CDN ou VPS foi verificada neste ciclo. | Comprovado localmente; deploy externo não validado |

## Causa raiz e impacto

**Causa comprovada para a inconsistência visual local:** implementações paralelas continuam acessíveis por URLs distintas. A navegação mistura entradas novas e antigas. A rota antiga não era redirecionada e podia ser aberta por favorito, histórico ou links internos. O processo atual está servindo simultaneamente a versão nova e a antiga, portanto reiniciar ou limpar cache não unificaria essas telas.

**Fator adicional para divergência de registros:** dados demonstrativos residem no navegador por origem. Trocar `localhost` por `127.0.0.1` cria outra base local, sem alterar o código servido. A persistência real em banco e o deploy de produção requerem auditoria separada.

## Plano de correção do ciclo

1. Manter as URLs antigas como redirecionamentos temporários para `queue-v2` e `validation-v2`, preservando os registros locais.
2. Fazer o Dashboard e o retorno do despacho apontarem às páginas atuais.
3. Publicar metadados automáticos da versão da aplicação, do commit, horário de build, ambiente e fingerprint de fonte em uma rota `no-store` e em Configurações.
4. Adicionar verificação pós-publicação que compare o fingerprint esperado com o processo acessado.
5. Validar as rotas, build, testes e a tela realmente renderizada no navegador.

## Riscos e limites

- `f14d083` sozinho **não identifica** as alterações recentes porque a árvore de trabalho está majoritariamente fora do Git. O fingerprint de fonte deve ser comparado ao build efetivo; o próximo deploy precisa vir de um commit rastreado.
- `/demo/field-service` ainda agrega detalhes e ações da OS. O acesso sem `ticket` agora vai à visão geral; links com `ticket` permanecem na página de detalhe. A consolidação dessas ações na experiência atual continua pendente.
- Não há justificativa para apagar `localStorage`, Cache Storage, banco ou `.next` nesta etapa.
- Sem acesso à configuração da VPS/CDN e sem sessão autenticada, a versão remota e os dados privados permanecem não validados.

## Implementação e validação deste ciclo

| Verificação | Resultado |
| --- | --- |
| Navegação antiga | `/demo/field-service/queue?x=1` e `/demo/field-service/validation?ticket=REQ-1` retornam 307 para as rotas `-v2`, preservando a query string. O favorito antigo da fila chegou à fila nova no navegador. |
| Dashboard e despacho | Atalho do Dashboard aponta para a visão geral atual; retorno do despacho aponta para `queue-v2`. |
| Versão | `/api/version` retorna versão `0.1.0`, commit, horário, ambiente, ID de deploy e SHA-256 das fontes com `no-store`. A página `Configurações → Sobre o OneIT` mostrou esses dados no navegador. A versão de desenvolvimento calcula o SHA-256 ao consultar; o build grava um manifesto automático. |
| Servidor local | `localhost:3000` e `127.0.0.1:3000` responderam 200 e exibiram o mesmo fingerprint. Após o reload de `next.config.ts`, o processo na porta 3000 passou a PID 1636. |
| Testes | `npm run typecheck` passou; ESLint dos arquivos modificados passou; `npm test` passou com 80 arquivos e 154 testes. A suíte inicialmente revelou uma asserção de texto obsoleta em `field-validation-flow.test.ts`, atualizada para a navegação vigente. |
| Build | Primeiro build isolado falhou em Windows com `EPERM` ao criar subpasta de `.next-version-audit`. Repetição em outra pasta compilou e revelou erro de pré-renderização por `useSearchParams` sem `Suspense` no acesso do parceiro. Corrigido. Build final em `.next-version-audit-3` terminou com código 0 e gerou 196 páginas estáticas. |
| Smoke de produção local | Artefato standalone iniciado temporariamente em `127.0.0.1:3001`: `/api/version`, `/api/health`, fila nova, validação nova, “Sobre” e acesso do parceiro responderam 200; a fila antiga redirecionou com 307. `check-running-version.mjs` confirmou `oneit-ca9489efd1f7-20261025220203` e fingerprint `ca9489efd1f7` tanto para o build quanto para a fonte correspondente. Servidor 3001 encerrado após o teste. |
| Navegador | Fila atual e “Sobre o OneIT” renderizaram no navegador interno; os logs capturados nessas duas abas não continham `error` ou `warn`. |
| Banco local | `/api/ready` respondeu 503 com `deploymentMode: legacy`. Não foi possível confirmar conexão com banco neste ambiente; a fila demonstrativa usa `localStorage`. Nenhum banco, volume, cache ou dado local foi limpo. |

## Pendências priorizadas

1. **P0 para deploy:** registrar no Git a aplicação real. O commit HEAD é apenas o inicial, enquanto praticamente todo o produto atual é não rastreado. Um deploy baseado exclusivamente no commit `f14d083` não representa a aplicação observada localmente. Não foi feito commit neste ciclo para não agrupar indiscriminadamente alterações preexistentes.
2. **P1:** consolidar a página `/demo/field-service?ticket=...` (detalhe e ações antigas) em um fluxo atual antes de redirecionar também os links profundos. Ela continua necessária para LPU/RTO, mas visualmente destoa da fila e da validação.
3. **P1:** configurar e verificar ambiente persistente de homologação/produção; `/api/ready` precisa passar e jornadas com dados reais devem ser testadas. Não há evidência de banco conectado no local.
4. **P1:** validar o deploy remoto/VPS, se houver, comparando `/api/version` com o manifesto do artefato publicado. Nenhum servidor externo ou CDN foi inspecionado aqui.
5. **P2:** inspecionar em um navegador já usado pelo usuário se existe SW antigo registrado e quais chaves `localStorage` existem em cada origem. O código atual não guarda HTML, mas o estado histórico desse perfil não foi acessível pelas ferramentas de inspeção usadas.
6. **P2:** evitar que builds isolados alterem `tsconfig.json` automaticamente. As entradas temporárias adicionadas pelo Next foram retiradas após a validação.

**Parecer deste ciclo:** a inconsistência visual local foi reproduzida e a navegação antiga corrigida. O build novo é tecnicamente executável. Isto não atesta banco, autenticação, deploy remoto ou prontidão para produção.

## Rotina de publicação verificável

1. Trabalhar a partir de um commit que contenha o código atual. Executar `npm run check:release-tree` e registrar o SHA. O preflight de VPS e a CI também executam esta checagem.
2. Executar `npm run typecheck`, `npm test` e `npm run build` no ambiente de build. `prebuild` gera o manifesto `public/build-info.json` automaticamente.
3. Publicar o artefato standalone produzido pelo build, incluindo `public/` e os assets estáticos, sem reutilizar um processo ou imagem anteriores.
4. Consultar `/api/health` e `/api/ready`. Um `health` 200 isolado não comprova conexão com o banco; `ready` precisa responder 200 antes de liberar tráfego real.
5. Rodar `npm run check:running-version -- https://URL-PUBLICADA` a partir do mesmo artefato/fonte da publicação. Conferir `deploymentId`, commit e fingerprint em `Configurações → Sobre o OneIT`.
6. Fazer smoke das rotas de Dashboard, Chamados, fila Field, validação, login e BM em sessão nova e sessão já aberta. Registrar resultado, horário e versão.
7. Se a versão divergir, interromper a liberação, identificar instância/imagem/URL e reverter ao artefato anterior conhecido. Não limpar dados do navegador ou banco como primeira medida.

## Continuação — trava de publicação e entrada do Field

- `scripts/check-release-tree.mjs` bloqueia publicação com arquivos Git modificados ou não rastreados. Em 25/10, a execução local retornou código 1 e identificou **882 arquivos** nessas condições. Esse número descreve a árvore atual, não um deploy remoto. É necessário revisar e registrar o conjunto real de código antes de publicar; o gate não faz commit nem exclui arquivos.
- `deploy/preflight.sh` chama a trava antes de validar as variáveis de produção. A CI chama a mesma verificação após `npm ci`. Os dois guias de VPS agora incluem o preflight antes do Compose.
- `.dockerignore` exclui saídas temporárias de build e QA do contexto da imagem. `public/build-info.json` e `public/offline-app.js` são regenerados no build e também não entram como artefatos locais obsoletos.
- Os comandos de VPS passaram a usar `docker compose --env-file .env.production`: `env_file` no serviço não preenche a interpolação dos argumentos de build. Essa correção de instrução foi conferida contra `compose.vps.yml` e `Dockerfile`; o Compose não foi executado neste notebook.
- A entrada `/demo/field-service` sem `ticket` respondeu **307** para `/demo/field-service/overview`. O link `/demo/field-service?ticket=REQ-1` respondeu **200**, preservando o detalhe necessário. A verificação foi por HTTP no servidor local, sem alterar dados.
- Teste do gate: **1 aprovado**. Suíte completa: **81 arquivos e 155 testes aprovados**. `npm run typecheck`, ESLint dos arquivos de código alterados e `git diff --check`: **aprovados**. O build completo de produção aprovado no ciclo anterior não foi repetido nesta etapa, pois a mudança funcional foi apenas o redirecionamento condicionado, verificado por HTTP; um novo build deve integrar a revisão de publicação.
- **Limite:** o bloqueio Git e o `/api/ready` local 503 impedem classificar esta árvore como pronta para produção. A unificação do detalhe da OS com a fila e a validação atuais permanece P1.
