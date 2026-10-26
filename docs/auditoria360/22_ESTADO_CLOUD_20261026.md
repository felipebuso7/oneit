# Estado da preparação em nuvem

Data: 26/10/2026. Nenhum deploy de OneIT, migration remota ou e-mail foi executado nesta rodada.

## Acesso e identidade dos ambientes

| Serviço | Fato verificado | Consequência |
|---|---|---|
| GitHub | CLI autenticada como `felipebuso7`. Repositório privado [`felipebuso7/oneit`](https://github.com/felipebuso7/oneit) criado; `main` contém o commit base `f14d083`; trabalho OneIT está na branch `prep/cloud-staging` e no [PR rascunho #1](https://github.com/felipebuso7/oneit/pull/1). | CI Linux pode ser executado sem publicar o aplicativo. A integração GitHub do Codex usa outra conta e não tem acesso a esse repositório; operações Git usaram a CLI local. |
| Supabase | Login concluído na organização `ServTecj` (Free). O projeto anterior, ref `fdnqxpvgviigkrctsibo`, contém migrations de setembro e tabelas de inventário/medição do OneFlow; foi preservado. O proprietário criou `oneit-staging`, ref `bkhcnqkhiablstdqdyic`, sem migrations. | O banco OneIT de homologação está separado e saudável, mas foi criado em `us-east-2` (Ohio), embora São Paulo tenha sido solicitado. Usar apenas dados fictícios nesta etapa. O painel indicou ausência de backups nos dois projetos; não há restore testado. |
| Vercel | Login concluído no workspace `Okaa` (Hobby). A importação reconhece o repositório privado `felipebuso7/oneit` e propõe a branch `main`. | Nenhum projeto/deploy OneIT foi criado. A branch `main` ainda é a base inicial; clicar em Deploy agora não publicaria a revisão em homologação. |

## Gates executados

| Gate | Evidência e limite |
|---|---|
| `npm run typecheck` e `npm test` | O CI Linux anterior aprovou typecheck e os 167 testes. Depois da atualização de dependências, typecheck e 167 testes passaram localmente fora da restrição de pasta temporária do Windows. A revisão em CI repetiu esses gates; a execução completa ainda precisa concluir. |
| Quatro escopos de lint | O CI Linux anterior aprovou os quatro escopos após o ajuste de aspas em caminhos com parênteses. A revisão de dependências precisa repetir o gate. |
| `npm run audit:migrations:strict` | O primeiro CI confirmou prefixo duplicado `20261024120000`. O arquivo de evidências do RTO foi apenas renomeado para `20261024120500_report_evidence_paths.sql`, sem mudança no SQL; a auditoria estrita local agora passa com 162 arquivos. Essa renomeação só é diretamente segura para instalação limpa. Uma base OneIT que já tenha aplicado o nome antigo exigiria reconciliação do histórico antes de upgrade. |
| `npm run check:production-env` | Reprovado por falta de variáveis reais de Supabase e URL pública. Não colocar credenciais no Git ou em documentação. |
| Build de produção | Duas tentativas locais no Windows falharam com `EPERM`, mas o CI Linux do commit `68af627` aprovou o build do Next e do contêiner. A revisão de dependências precisa repetir ambos. |
| Dependências | `npm audit` identificou avisos críticos em Next/Vitest e outros alertas. Next, Zod, Vitest e dependências transitivas foram atualizados; o audit local da revisão nova informou zero vulnerabilidades. O CI passará a executar `npm audit --audit-level=high`. |
| Banco limpo | O primeiro job de instalação limpa chegou à migration `20261001341000_change_organization_member_role.sql` e reprovou por `current_role` ser usado sem aspas como identificador SQL. A sintaxe foi corrigida preservando o nome do argumento de RPC; a execução de todas as migrations ainda precisa ser repetida e aprovada. |

## Bloqueios para hospedagem funcional

1. Concluir CI completo em Linux, incluindo a instalação limpa do banco, com as dependências e a migration corrigidas. O PR permanece rascunho até a revisão de segurança e operação.
2. Vincular a CLI oficial, fixada no projeto, exclusivamente ao `oneit-staging`. A senha de banco foi definida pelo proprietário e não deve ser publicada nem inserida em comandos/logs. Verificar região e controles de exposição antes de utilizar dados reais em qualquer projeto futuro.
3. Executar as 162 migrations em instalação limpa de teste e auditar RLS, permissões, dados de demonstração, autenticação, fluxo Field, RTO e BM. A auditoria estática de nomes não equivale a teste de instalação.
4. Corrigir os P0 do fluxo fiscal e confirmar o executor de e-mails e jobs. O fechamento fiscal não pode registrar envio final sem evidência do provedor. Não inferir entrega pelo aceite da API.
5. Definir topologia e operação: o ADR 0003 aponta para VPS, mas a solicitação atual cita GitHub, Supabase e Vercel. Para esta rodada, os serviços externos são candidatos a homologação; produção requer decisão registrada, backup/restore, observabilidade, custos e política de acesso.
6. Configurar variáveis por ambiente, proteção da prévia, URL de retorno de autenticação e domínio. Só depois criar deploy de homologação a partir do commit revisado; promover para produção apenas após testes e backup verificável.
7. Unificar o fluxo utilizado pelo usuário em `/demo` com persistência e autorização de produção. A página inicial direciona para `/demo`; partes da fila e do Field Service usam `localStorage`, enquanto o portal autenticado usa Supabase. Um deploy atual não sincronizaria esse fluxo entre gestor e técnico nem substituiria os dados locais por dados do banco.

## Parecer

**Não apto para produção nesta data.** Há conectividade e acesso autenticado aos três serviços, repositório privado, PR rascunho, CI Linux verde na revisão anterior e banco OneIT vazio de homologação. Ainda faltam CI verde na revisão atual, instalação e testes integrados, configuração de segredos, persistência real do fluxo `/demo` e resolução dos bloqueios fiscais. Nenhum URL público funcional foi validado.

Referências: [Vercel Git deployments](https://vercel.com/docs/git), [Supabase environments](https://supabase.com/docs/guides/deployment/managing-environments) e [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs).
