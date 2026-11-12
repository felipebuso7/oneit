# Plano de validação e regressão

## Gates

1. **Build:** typecheck, lint, build e migrations audit.
2. **Contrato:** APIs com payload inválido, retry e concorrência.
3. **Dados:** CRUD e relacionamento por entidade; persistência após reload.
4. **Segurança:** dois tenants, papéis Owner/Admin/Operações/Financeiro/Técnico/Parceiro.
5. **E2E:** chamado → despacho → WhatsApp preparado → eventos → evidências → assinatura → checkout → review → LPU → RTO → BM.
6. **UX:** screenshots nos breakpoints 360/768/1440, teclado, contraste, estados vazio/erro.
7. **Operação:** readiness, logs, storage, backup/restore e rollback.

## Resultado atual

Build, typecheck e 309 testes Vitest passaram. Health/readiness de produção passou. Gates de segurança multi-tenant, E2E completo, visual global, entrega externa e restore estão **não executados**.

## Critério de liberação

Nenhum P0 aberto; E2E repetido sem duplicação; RLS aprovado; storage privado validado; PDF/BM recuperáveis; logs e rollback documentados.
