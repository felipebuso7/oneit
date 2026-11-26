# Matriz funcional (estado verificável)

| Módulo | Esperado | Verificado | Evidência | Situação |
|---|---|---|---|---|
| Autenticação | sessão, logout e rotas protegidas | implementação presente; E2E não executado | `src/lib/auth`, rotas portal | Parcial |
| Solicitantes | empresa, polo, pesquisa, status | empresa/polo e pesquisa integrados nesta rodada | `ticket-create-flow.tsx`, migration 20261127110000 | Corrigido |
| Chamados | persistência e validação tenant/cliente | guards SQL e server action presentes | `tickets/actions.ts`, migrations | Parcial |
| Field service | aceite, deslocamento, execução e validação | componentes/API presentes; fluxo real não comprovado | `src/app/api/field-service`, `src/components/field-service` | Parcial |
| RTO/BM | PDF, medição e histórico | implementações e testes unitários presentes | `src/domain/reports`, `tests` | Parcial |
| Agenda | calendário e filtros | página existente; inspeção visual autenticada pendente | rotas de agenda | Parcial |
| Administração | papéis e auditoria | funções/policies presentes; teste bilateral pendente | migrations e `src/lib/auth` | Parcial |
