# Ciclo 18 — continuidade da OS na revisão

## Evidência e correção

As ações de LPU, decisão gerencial, geração de RTO e encerramento em `src/app/(portal)/portal/review/actions.ts` redirecionavam sempre para `/portal/review?message=...`. Assim, a OS aberta pela fila de chamados perdia seu contexto após qualquer ação ou erro.

Os formulários da fila agora enviam `returnOrderId`. O servidor valida esse identificador como UUID e o usa exclusivamente no endereço interno de retorno. A autorização e as transições continuam nas funções autenticadas do banco, com `queueId`, `ticketId` e `serviceOrderId` próprios. Valores inválidos de navegação retornam à fila geral, sem redirecionamento externo.

## Validação executada

- `tests/review-action-context.test.ts` e `tests/review-navigation.test.ts`: 25 testes aprovados, com sucesso, erro do backend, entrada inválida e tentativa de destino externo.
- `npx tsc --noEmit`: aprovado.
- `git diff --check`: aprovado.

O fluxo real com Supabase e a renderização no navegador não foram reexecutados neste ciclo. A alteração ainda está apenas no checkout local; não foi publicada.
