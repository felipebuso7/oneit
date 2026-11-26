# Linha de base de desempenho

Data: 2026-11-26 (America/Sao_Paulo)

## Evidência disponível

- Build de produção e typecheck já haviam passado antes desta auditoria.
- As filas principais já usam limites explícitos em dashboard, agenda, rotas, revisão e encerramento.
- O shell local não conseguiu obter resposta HTTP reproduzível dos domínios Vercel durante esta sessão; por isso não há latência de produção declarada.

## Correção aplicada

Foi criada a migration `20261126230000_operational_query_indexes.sql` com índices para:

- filas de chamados por organização e atualização;
- agenda filtrada por status e início planejado;
- ordens de serviço por organização, status e horário.

Os índices são incrementais e `if not exists`; não alteram dados.

## Pendências de medição

- Medir TTFB/LCP em navegador autenticado.
- Medir consultas reais com dados volumosos em homologação.
- Comparar planos `EXPLAIN (ANALYZE, BUFFERS)` antes/depois.
- Executar teste de carga controlado fora de produção.
