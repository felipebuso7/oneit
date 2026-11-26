# Plano de testes

- Unitários: validações, cálculos, sincronização offline e PDF.
- Integração: server actions, RPCs, migrations e Storage.
- Segurança: dois usuários/tenants, IDOR, RLS, links assinados.
- E2E: login, cadastro de solicitante, abertura de chamado, OS, RTO e BM.
- Regressão: filtros, reload, estados de erro, responsividade 320–430 px.
- Quality gate: lint, typecheck, build e Vitest com código de saída 0.

Nesta auditoria, somente a auditoria estática de migrations foi concluída com sucesso. Os demais itens permanecem rastreados como pendentes ou bloqueados.
