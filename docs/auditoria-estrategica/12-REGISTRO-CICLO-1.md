# Registro do ciclo 1 — contenção e cadastros

Data: 28/10/2026

## Diagnosticar

- O portal já consultava `technicians` para despacho e mantinha `field_service_technicians` como vínculo administrativo.
- O vínculo podia depender de sincronização manual em dados antigos.
- O portal de produção não tinha uma guarda explícita contra modo `legacy` se a variável de implantação estivesse ausente.

## Corrigir

1. Adicionada `isSupportedProductionDeploymentMode` em `src/lib/runtime/readiness.ts`.
2. O layout autenticado (`src/app/(portal)/layout.tsx`) agora redireciona produção mal configurada para login, evitando operação silenciosa em runtime legado.
3. **Correção do diagnóstico anterior:** a sincronização já existe no repositório em `20261027210000_auto_field_service_technician_mapping.sql`, refinada por `20261027213000_field_service_technician_email_collision.sql`. O rascunho `20261028230000_auto_sync_operational_technicians.sql` criaria uma segunda trigger e não preservava o tratamento existente de colisões. Foi removido junto de seu teste, sem aplicação ao banco. As migrations originais foram preservadas.
4. A action `updateTechnician` agora envia `null`, em vez de `undefined`, quando e-mail, telefone, cidade-base ou região são apagados. Omitir esses campos do JSON de atualização preservava os valores anteriores no banco.
5. `/api/ready?storage=1` agora responde HTTP 503 e `not_ready` em falhas retornadas ou exceções do Storage, sem expor detalhes do provedor. Antes informava HTTP 200 e `ready` mesmo com falha.

## Validação

- `git diff --check`: aprovado.
- `tsc --noEmit`: aprovado.
- ESLint dos arquivos alterados: aprovado.
- Após o bloqueio inicial de arquivos temporários pelo sandbox, execução local autorizada do Vitest: **6 arquivos, 27 testes aprovados** (`ready-route`, `readiness`, `technician-update-action`, `technician-crud-contract`, `technician-source-of-truth-contract`, `technician-eligibility`). Os testes novos executam a action e o handler com mocks; os testes de contrato anteriores incluem inspeção textual. Não são testes E2E, de persistência real ou de RLS.
- Auditoria estrita de migrations continua apontando apenas o alerta preexistente de drop/recreate em `20261028193000_partner_context_details.sql`.
- A tentativa anterior de aplicar a migration foi bloqueada pela revisão automática. A proposta foi posteriormente descartada por redundância; não há necessidade de aprovar aquele backfill. Nenhuma migration ou alteração de dados remotos foi executada neste ciclo.

## Risco residual

As actions de criação/edição ainda gravam em `field_service_technicians` após gravar em `technicians`, apesar da trigger existente. Isso introduz uma segunda operação não atômica; a edição pode tentar substituir o e-mail alternativo escolhido pela trigger e falhar por unicidade. Próximo passo: confirmar versão das migrations no ambiente de teste, consolidar gravações e testar colisões, concorrência, RLS e CRUD → despacho com persistência real. Não retirar compatibilidade com ambientes antigos sem verificar suas dependências.

Não foi feita publicação neste ciclo. O endpoint de prontidão sem `storage=1` verifica configuração; mesmo a listagem bem-sucedida do bucket não comprova capacidade de upload. Não foram repetidos build, validação visual ou jornadas em produção; o bloqueio de build do ciclo anterior continua sem resolução comprovada.
