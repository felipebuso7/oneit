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
- Os commits `d9674ab`, `3cde5f6` e `fdfed79` foram publicados no GitHub nas branches `prep/cloud-staging` e `main`.
- O GitHub foi conectado ao projeto Vercel (`felipebuso7/oneit`). O deployment de preview do commit `fdfed79` ficou **Ready** em `oneit-btgduul66-okaa1.vercel.app`, mas o ambiente de preview não possui as variáveis de autenticação e redireciona para `error=environment`.
- O push para `main` disparou o deployment de produção `oneit-rf8jbd9p6-okaa1.vercel.app`; na última consulta ele estava **Building**. O domínio oficial `https://oneit-omega.vercel.app` só deve ser considerado atualizado após esse deployment ficar Ready e os checks de runtime passarem.
- Validações dinâmicas dependem de sessão autenticada e não substituem E2E completo.

## Próxima ação

Após o deployment de `main` ficar Ready, validar dinamicamente as rotas de chamados, agendamento, agenda, validação e RTO no domínio oficial; depois tratar o primeiro P1 reproduzível.
