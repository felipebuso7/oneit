# OneIT — status de continuidade

Atualizado em 12/11/2026.

## Último lote validado

- Padronização de nomenclatura do despacho: **Agendamento de OS**.
- Padronização da agenda do técnico: **Agenda Técnicos**.
- Horários do técnico formatados no fuso `America/Sao_Paulo`.
- Lista de RTOs alinhada ao rótulo operacional **RTO Encerrados**.
- Teste de contrato do despacho aprovado e TypeScript aprovado.
- Regressão automatizada P1 executada: 11 arquivos e 20 testes aprovados cobrindo despacho, revisão, RTO, fotos, LPU e download.
- Regressão adicional de evidências/storage: 5 arquivos e 9 testes aprovados, incluindo fotos, erros de RTO, fluxo do parceiro e integridade de banco.
- Regressão completa executada: 161 arquivos e 384 testes aprovados.
- Build de produção local iniciado, mas bloqueado por `EPERM` ao limpar `.next/server/app/portal/field-service`; não é falha de compilação confirmada.

## Estado conhecido

- O worktree possui alterações anteriores do projeto; não fazer limpeza destrutiva.
- Produção não foi publicada nesta rodada.
- Verificação dinâmica em `https://oneit-omega.vercel.app/portal` confirmou sessão autenticada e menu atualizado, mas o atalho da home ainda aparece publicado como “Abrir Central Field Service”; a correção local “Abrir Agendamento de OS” ainda não está refletida em produção.
- Validações dinâmicas dependem de sessão autenticada e não substituem E2E completo.

## Próxima ação

Executar validação dinâmica autenticada das rotas de chamados, agendamento, agenda, validação e RTO; depois tratar o primeiro P1 reproduzível.
