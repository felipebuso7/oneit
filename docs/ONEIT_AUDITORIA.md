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
- Verificação dinâmica: a produção está acessível e autenticada, porém ainda serve o texto antigo “Abrir Central Field Service” na home; isso confirma que as correções locais ainda aguardam publicação.
- Vercel: deployment de produção pronto, porém criado anteriormente; branch `prep/cloud-staging` também mostra preview antigo. O projeto ainda solicita conexão Git, então não há evidência de integração automática ativa.
- Conexão Git concluída pelo painel Vercel. O novo build do commit `3cde5f6` foi criado e estava em andamento na última consulta; resultado final ainda não verificado.
- Dados observados em produção devem ser confirmados antes de qualquer correção cadastral.
