# Estado da preparação em nuvem

Data: 26/10/2026. Nenhum deploy de OneIT, migration remota ou e-mail foi executado nesta rodada.

## Acesso e identidade dos ambientes

| Serviço | Fato verificado | Consequência |
|---|---|---|
| GitHub | CLI autenticada como `felipebuso7`. Repositório privado [`felipebuso7/oneit`](https://github.com/felipebuso7/oneit) criado; `main` contém o commit base `f14d083`; trabalho OneIT está na branch `prep/cloud-staging` e no [PR rascunho #1](https://github.com/felipebuso7/oneit/pull/1). | CI Linux pode ser executado sem publicar o aplicativo. A integração GitHub do Codex usa outra conta e não tem acesso a esse repositório; operações Git usaram a CLI local. |
| Supabase | Login concluído na organização `ServTecj` (Free). O único projeto visível tem ref `fdnqxpvgviigkrctsibo`, migrations de setembro para inventário e medição, e tabelas como `assets` e `billing_google_sheets`. | A evidência aponta para o OneFlow, não para o OneIT. O projeto não será reutilizado nem migrado. Ainda não há banco OneIT de homologação. O painel indicou ausência de backups do projeto existente; isso exige conferência antes de qualquer operação nele. |
| Vercel | Login concluído no workspace `Okaa` (Hobby). A importação reconhece o repositório privado `felipebuso7/oneit` e propõe a branch `main`. | Nenhum projeto/deploy OneIT foi criado. A branch `main` ainda é a base inicial; clicar em Deploy agora não publicaria a revisão em homologação. |

## Gates executados

| Gate | Evidência e limite |
|---|---|
| `npm run typecheck` e `npm test` | Na verificação local inicial: aprovados; 84 arquivos e 167 testes. Após o ajuste de versionamento, o teste específico `report-evidence-paths-migration.test.ts` passou. A suíte integral precisa rodar novamente no CI da revisão atual. |
| Quatro escopos de lint | Passaram no Windows na verificação inicial. O primeiro CI Linux mostrou falha de sintaxe em `lint:stabilization` porque dois caminhos com parênteses não estavam entre aspas. O script foi corrigido e passou localmente; aguarda resultado do CI atual. |
| `npm run audit:migrations:strict` | O primeiro CI confirmou prefixo duplicado `20261024120000`. O arquivo de evidências do RTO foi apenas renomeado para `20261024120500_report_evidence_paths.sql`, sem mudança no SQL; a auditoria estrita local agora passa com 162 arquivos. Essa renomeação só é diretamente segura para instalação limpa. Uma base OneIT que já tenha aplicado o nome antigo exigiria reconciliação do histórico antes de upgrade. |
| `npm run check:production-env` | Reprovado por falta de variáveis reais de Supabase e URL pública. Não colocar credenciais no Git ou em documentação. |
| Build de produção | Duas tentativas locais no Windows falharam com `EPERM` ao criar diretórios do Next. O CI Linux e o build do contêiner ainda são a validação necessária. Não considerar o aplicativo compilado para produção até essa etapa passar. |

## Bloqueios para hospedagem funcional

1. Fazer CI completo passar em Linux, incluindo build e contêiner. O PR permanece rascunho enquanto houver falhas.
2. Criar um projeto Supabase separado para homologação do OneIT. A criação exige uma senha de banco nova, configurada pelo proprietário no painel; guardar o segredo fora do repositório. Selecionar região e controles de exposição de tabelas deliberadamente.
3. Executar as 162 migrations em instalação limpa de teste e auditar RLS, permissões, dados de demonstração, autenticação, fluxo Field, RTO e BM. A auditoria estática de nomes não equivale a teste de instalação.
4. Corrigir os P0 do fluxo fiscal e confirmar o executor de e-mails e jobs. O fechamento fiscal não pode registrar envio final sem evidência do provedor. Não inferir entrega pelo aceite da API.
5. Definir topologia e operação: o ADR 0003 aponta para VPS, mas a solicitação atual cita GitHub, Supabase e Vercel. Para esta rodada, os serviços externos são candidatos a homologação; produção requer decisão registrada, backup/restore, observabilidade, custos e política de acesso.
6. Configurar variáveis por ambiente, proteção da prévia, URL de retorno de autenticação e domínio. Só depois criar deploy de homologação a partir do commit revisado; promover para produção apenas após testes e backup verificável.

## Parecer

**Não apto para produção nesta data.** Há conectividade e acesso autenticado aos três serviços, repositório privado e PR rascunho. Ainda faltam CI verde, banco OneIT separado, instalação e testes integrados, configuração de segredos e resolução dos bloqueios fiscais. Nenhum URL público funcional foi validado.

Referências: [Vercel Git deployments](https://vercel.com/docs/git), [Supabase environments](https://supabase.com/docs/guides/deployment/managing-environments) e [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs).
