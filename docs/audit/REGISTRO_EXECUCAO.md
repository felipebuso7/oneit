# Registro de execução

## 2026-11-26

- Inspecionada árvore do projeto, package scripts, rotas, migrations e testes.
- Contagens: 159 páginas, 72 APIs, 217 migrations.
- `npm run audit:migrations:strict`: aprovado, nenhum alerta estático.
- `npm run lint`: iniciado, sem resultado final no limite operacional.
- `npm run typecheck`: geração de tipos concluída; `tsc` não finalizou no limite.
- `npm test`: Vitest iniciou, sem resultado final no limite.
- `npm run build`: prebuild concluiu; `next build` não finalizou no limite.
- Deployment público consultado: commit `e25949b`, anterior ao commit auditado `e7fbabb`.
- Nenhuma alteração destrutiva executada.
- Revalidação de CODE-001: `src/proxy.ts` já bloqueia as rotas `/demo` e `/api/demo` com HTTP 404 em produção; item marcado como mitigado/concluído sem remover dados de demonstração usados em preview.
- Aplicada a migration `20261127120000_operational_lookup_indexes.sql` no Supabase, criando índices compostos não destrutivos para colaboradores, localidades e chamados.
- Não foi executado saneamento automático: não há evidência suficiente para corrigir registros incompletos sem decisão de negócio.
- Ajustado o contrato de erro de abertura de chamados para informar vínculo do solicitante/departamento ao cliente, sem expor stack trace; adicionados testes de contrato e executados 3 testes com sucesso.
