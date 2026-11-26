# Plano mestre de remediação

1. **Banco e segurança:** concluir teste RLS bilateral e validar migrations no ambiente remoto.
2. **Backend:** executar contratos de API, idempotência e transições de OS com duas identidades.
3. **Frontend:** concluir typecheck/build e smoke autenticado após deployment.
4. **QA:** executar Vitest, E2E e regressão visual em CI.
5. **UX/UI:** revisar portal mobile e agenda em navegador real.
6. **Operação:** confirmar Vercel, health check, logs e rollback.

Itens bloqueados externamente não devem impedir os itens estáticos e locais. Cada alteração deve ter migration incremental, teste e commit rastreável.
