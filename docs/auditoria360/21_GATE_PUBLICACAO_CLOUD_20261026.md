# Verificação de acesso e gate de publicação em nuvem

Data: 26/10/2026. Escopo: checkout local `servicia-fsm`, GitHub, Supabase e Vercel. Nenhum deploy, migration ou e-mail foi executado.

## Acesso confirmado

| Serviço | Resultado observado | Limite |
|---|---|---|
| GitHub | A integração do Codex respondeu pela conta Ellares, sem repositórios autorizados. O GitHub CLI, com acesso de rede liberado para leitura, confirmou a conta `felipebuso7`. Foi criado o repositório privado `felipebuso7/oneit` e configurado `origin` localmente. | O push da branch `prep/cloud-staging` foi rejeitado: o OAuth do `gh` não tem escopo `workflow` para publicar `.github/workflows/quality.yml`. A revisão automática recusou ampliar esse escopo sem autorização específica. O repositório permanece sem branch publicada. |
| Supabase | O site e o painel abriram no navegador. | A página terminou no formulário de login. Não há CLI, URL de projeto, conexão de banco nem credenciais configuradas neste ambiente. |
| Vercel | O site abriu no navegador. | A página redirecionou para login. Não há CLI, `.vercel/project.json` nem variáveis de projeto configuradas. |

Abrir o site confirma conectividade HTTP do navegador; não confirma acesso administrativo ou capacidade de publicar.

## Gates locais executados

| Gate | Resultado |
|---|---|
| `npm run typecheck` | Aprovado. |
| `npm test` | 84 arquivos e 167 testes aprovados. |
| Quatro escopos de lint do CI | Aprovados: `stabilization`, `field-service`, `core-ui` e `finance`. |
| `npm run check:production-env` | Reprovado: variáveis obrigatórias ausentes. |
| `npm run audit:migrations:strict` | Reprovado: dois arquivos com prefixo `20261024120000`. Não renomear sem conferir histórico do banco. |
| `npm run check:release-tree` | Aprovado após registro local do snapshot WIP na branch `prep/cloud-staging`, commit `ebb6440`. O commit ainda não foi enviado ao GitHub. |
| `npm run build` isolado, duas saídas distintas | Reprovado por `EPERM` ao criar diretórios dinâmicos do Next no Windows. Build Linux/CI não executado; não classificar como aprovado nem como defeito funcional confirmado. |

O Node local é 24.15.0; o workflow e Docker usam Node 20. O teste no runtime de produção ainda falta.

## Decisão de topologia pendente

O ADR 0003 declara VPS própria e migração gradual para serviços autogerenciados. A solicitação atual menciona GitHub + Supabase + Vercel. Esse arranjo é uma alternativa tecnicamente possível para a aplicação Next.js, mas precisa de uma decisão registrada sobre banco, storage, identidade, worker de e-mail, custos e operação. Não tratar o ADR anterior como se estivesse implementado: o código atual ainda depende das APIs Supabase.

## Sequência segura para habilitar publicação

1. Autenticar Vercel e Supabase, identificar organização/projeto corretos. Não compartilhar credenciais por chat.
2. Após autorização explícita para o escopo GitHub `workflow`, concluir o fluxo oficial de OAuth e enviar a branch WIP ao repositório privado. Não retirar o CI para contornar a recusa. A busca local por nomes de credenciais e padrões de segredo de alta confiança não encontrou candidatos; ainda será necessário revisar o conteúdo do primeiro PR.
3. Confirmar histórico e checksums das migrations no banco de homologação; resolver o prefixo duplicado sem reescrever migration aplicada. Homologar RLS e o fluxo fiscal bloqueado no backlog P0/P1.
4. Configurar variáveis por ambiente e o executor dos jobs/worker. Uma Function HTTP da Vercel não cria, por si só, um worker contínuo; escolher execução agendada ou serviço dedicado conforme frequência e limites do plano.
5. Executar CI em Node 20/Linux, build, migrations em staging, restore, login/RBAC e ciclo completo de Field + BM. Só promover a revisão testada para produção.

## Parecer

**Ainda não apto para produção.** Há repositório privado e commit local preparados, mas a branch não pôde ser enviada. Vercel e Supabase seguem sem sessão autenticada. Os gates de ambiente e migrations falham; o build Linux, o banco de teste e a homologação operacional permanecem pendentes.

Referências de fluxo: [Vercel Git deployments](https://vercel.com/docs/git), [Supabase environments](https://supabase.com/docs/guides/deployment/managing-environments) e [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs).
