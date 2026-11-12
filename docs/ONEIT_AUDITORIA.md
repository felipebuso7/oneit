# OneIT — auditoria contínua

## Evidências recentes

- `src/app/(portal)/portal/field-service/page.tsx`: título e erro alinhados a “Agendamento de OS”.
- `src/app/(portal)/portal/field/page.tsx`: agenda e horários padronizados para São Paulo.
- `src/app/(portal)/portal/field-service-reports/page.tsx`: título alinhado a “RTO Encerrados”.
- `tests/portal-field-dispatch-contract.test.ts`: contrato de nomenclatura e timezone aprovado.
- `npx tsc --noEmit --pretty false`: aprovado no lote anterior.
- Regressão automatizada P1: 11 arquivos / 20 testes aprovados (`field-service-end-to-end-contract`, review API/integrity/concurrency, RTO API/storage/render/photo, LPU, review queue e report download).
- Regressão adicional: 5 arquivos / 9 testes aprovados para fotos, storage, erros de RTO, fluxo externo e integridade de banco.
- Regressão completa: 161 arquivos / 384 testes aprovados em 82,16 s.
- Build local: bloqueado por `EPERM` ao remover diretório `.next` em uso; requer liberar o processo que mantém o artefato antes de repetir.

## Limitações

- Não há evidência de E2E completo nesta rodada.
- Não foram feitas alterações no banco, migrations ou produção.
- Verificação dinâmica: o preview `oneit-btgduul66-okaa1.vercel.app` foi criado a partir de `fdfed79` e concluiu como Ready, mas sem variáveis de ambiente de autenticação para preview (`error=environment`).
- O commit `fdfed79` e o registro posterior `3aee6a3` foram enviados para `main`; os deployments de produção ficaram **Ready**. O domínio oficial foi recarregado e confirmou a nomenclatura atualizada no portal.
- Conexão Git concluída pelo painel Vercel e confirmada pelo disparo automático dos deployments das branches `prep/cloud-staging` e `main`.
- Verificação dinâmica sem mutação no domínio oficial: fila de chamados com 6 registros, agendamento com 2 visitas e revisão com RTO pendente/disponível foram renderizados no portal autenticado; nenhuma rota `/demo` foi usada.
- LPU: contrato entre UI, APIs e migrations confirmado (`kind`, `unit`, `unit_price`, vigência e `active`); testes de CRUD e composição aprovados.
- Dados observados em produção devem ser confirmados antes de qualquer correção cadastral.
