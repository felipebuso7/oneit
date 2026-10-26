# Estado da preparação em nuvem

Data: 26/10/2026. Nenhum deploy de OneIT, migration remota ou e-mail foi executado nesta rodada.

## Decisão de hospedagem nesta rodada

O proprietário optou por não contratar o Supabase Pro agora, manter os projetos atuais e usar apenas uma prévia sem uso real por enquanto. Portanto, o projeto `oneit-staging` permanece em Ohio, sem backup gerenciado; o projeto anterior do OneFlow permanece preservado. Não foi criado projeto OneIT na Vercel, aplicado esquema ao Supabase remoto ou publicada URL de produção.

No commit `aba7621`, o caminho `/demo` e suas APIs passaram a responder 404 em build de produção, e a página inicial passa a direcionar para `/portal`. Esse bloqueio evita oferecer o fluxo baseado em `localStorage` como se fosse multiusuário. O preflight de produção também exige URL HTTPS e a chave de serviço necessária ao modo Supabase. Os testes locais dirigidos (8) e o typecheck passaram; o CI desse commit ainda deve ser conferido antes de registrar aprovação Linux. A prévia local de desenvolvimento continua acessível pelo fluxo `/demo` e não é evidência de prontidão para dados reais.

## Acesso e identidade dos ambientes

| Serviço | Fato verificado | Consequência |
|---|---|---|
| GitHub | CLI autenticada como `felipebuso7`. Repositório privado [`felipebuso7/oneit`](https://github.com/felipebuso7/oneit) criado; `main` contém o commit base `f14d083`; trabalho OneIT está na branch `prep/cloud-staging` e no [PR rascunho #1](https://github.com/felipebuso7/oneit/pull/1). | CI Linux pode ser executado sem publicar o aplicativo. A integração GitHub do Codex usa outra conta e não tem acesso a esse repositório; operações Git usaram a CLI local. |
| Supabase | Login concluído na organização `ServTecj` (Free). O projeto anterior, ref `fdnqxpvgviigkrctsibo`, contém migrations de setembro e tabelas de inventário/medição do OneFlow; foi preservado. O proprietário criou `oneit-staging`, ref `bkhcnqkhiablstdqdyic`, sem migrations. | O banco OneIT de homologação está separado e saudável, mas foi criado em `us-east-2` (Ohio), embora São Paulo tenha sido solicitado. Usar apenas dados fictícios nesta etapa. O painel indicou ausência de backups nos dois projetos; não há restore testado. |
| Vercel | Login concluído no workspace `Okaa` (Hobby). A importação reconhece o repositório privado `felipebuso7/oneit` e propõe a branch `main`. | Nenhum projeto/deploy OneIT foi criado. A branch `main` ainda é a base inicial; clicar em Deploy agora não publicaria a revisão em homologação. |

## Gates executados

| Gate | Evidência e limite |
|---|---|
| `npm run typecheck` e `npm test` | A [execução 40321077094](https://github.com/felipebuso7/oneit/actions/runs/40321077094) aprovou typecheck e 167 testes em Linux. Os 167 testes também passaram localmente fora da restrição de pasta temporária do Windows. |
| Quatro escopos de lint | A execução 40321077094 aprovou `stabilization`, `field-service`, `core-ui` e `finance`. O lint global legado continua fora desses escopos. |
| `npm run audit:migrations:strict` | O primeiro CI confirmou prefixo duplicado `20261024120000`. O arquivo de evidências do RTO foi apenas renomeado para `20261024120500_report_evidence_paths.sql`, sem mudança no SQL. A auditoria estrita passou com 165 arquivos no [CI 40365387614](https://github.com/felipebuso7/oneit/actions/runs/40365387614). Essa renomeação só é diretamente segura para instalação limpa. Uma base OneIT que já tenha aplicado o nome antigo exigiria reconciliação do histórico antes de upgrade. |
| `npm run check:production-env` | Reprovado por falta de variáveis reais de Supabase e URL pública. Não colocar credenciais no Git ou em documentação. |
| Build de produção | Duas tentativas locais no Windows falharam com `EPERM`; a execução 40321077094 aprovou o build do Next e do contêiner em Linux na revisão atual. |
| Dependências | `npm audit` identificou avisos críticos em Next/Vitest e outros alertas. Next, Zod, Vitest e dependências transitivas foram atualizados; o audit local informou zero vulnerabilidades e `npm audit --audit-level=high` passou na execução 40321077094. |
| Banco limpo | Três jobs sucessivos revelaram falhas de sintaxe, esquema e ordem de enum. Após as correções, o [CI 40365387614](https://github.com/felipebuso7/oneit/actions/runs/40365387614) aprovou a aplicação integral das 165 migrações, auditou privilégios efetivos do log de e-mail e lote fiscal e passou testes/builds em Linux. Isso ainda não valida toda a matriz RLS nem os fluxos com usuários reais. |
| Transição fiscal isolada | O job de banco [40366832191](https://github.com/felipebuso7/oneit/actions/runs/40366832191) passou no banco local descartável: `service_role` registrou aceite, o lote passou a `SENT` e a tentativa de mudar o valor depois do envio foi recusada. A transação de teste foi revertida. Ainda falta homologação com BMs reais e dois perfis. |

## Bloqueios para hospedagem funcional

1. Os jobs `verify` e `database_migrations` da execução 40365387614 passaram. O PR permanece rascunho até a revisão de segurança e operação; CI verde não substitui teste operacional integrado.
2. Vincular a CLI oficial, fixada no projeto, exclusivamente ao `oneit-staging`. A senha de banco foi definida pelo proprietário e não deve ser publicada nem inserida em comandos/logs. Verificar região e controles de exposição antes de utilizar dados reais em qualquer projeto futuro.
3. As 165 migrations já foram aplicadas em instalação limpa de teste no CI. Auditar RLS, permissões, dados de demonstração, autenticação, fluxo Field, RTO e BM com dados e usuários de teste; instalação limpa não equivale a homologação desses fluxos.
4. Corrigir os P0 do fluxo fiscal e confirmar o executor de e-mails e jobs. O fechamento fiscal não pode registrar envio final sem evidência do provedor. Não inferir entrega pelo aceite da API.
5. Definir topologia e operação: o ADR 0003 aponta para VPS, mas a solicitação atual cita GitHub, Supabase e Vercel. Para esta rodada, os serviços externos são candidatos a homologação; produção requer decisão registrada, backup/restore, observabilidade, custos e política de acesso.
6. Configurar variáveis por ambiente, proteção da prévia, URL de retorno de autenticação e domínio. Só depois criar deploy de homologação a partir do commit revisado; promover para produção apenas após testes e backup verificável.
7. Unificar o fluxo utilizado pelo usuário em `/demo` com persistência e autorização de produção. A página inicial direciona para `/demo`; partes da fila e do Field Service usam `localStorage`, enquanto o portal autenticado usa Supabase. Um deploy atual não sincronizaria esse fluxo entre gestor e técnico nem substituiria os dados locais por dados do banco.

## Parecer

**Não apto para produção nesta data.** Há conectividade e acesso autenticado aos três serviços, repositório privado, PR rascunho, CI Linux verde (aplicativo, contêiner e instalação limpa do banco) e banco OneIT vazio de homologação. Ainda faltam testes integrados, configuração de segredos, persistência real do fluxo `/demo` e resolução dos bloqueios fiscais. Nenhum URL público funcional foi validado.

Referências: [Vercel Git deployments](https://vercel.com/docs/git), [Supabase environments](https://supabase.com/docs/guides/deployment/managing-environments) e [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs).
