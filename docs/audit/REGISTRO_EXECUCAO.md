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
- Melhorada a listagem de solicitantes com pesquisa por nome/e-mail/empresa/polo e filtros por empresa, polo e status; testes de contrato executados com 4 testes aprovados (Vitest apresentou aviso de encerramento tardio do processo).
- Deployment público confirmado em `https://oneit-okaa1.vercel.app`: commit `a78d650`, deployment `oneit-f81db7df31-20261126190937`; `/api/health` e `/api/ready` retornaram HTTP 200.
- Aplicada melhoria global mobile em `src/app/globals.css`: controles de formulário passam a 16px e botões OneIT a 48px de altura mínima; contratos de Design System/responsividade executados com 5 testes aprovados.
