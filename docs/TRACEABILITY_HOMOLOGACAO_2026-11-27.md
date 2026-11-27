# Matriz de rastreabilidade e homologação — ONEIT

Data da verificação: 27/11/2026 (America/Sao_Paulo)

Esta matriz registra somente evidências verificadas no repositório, Supabase e endpoint público. Código existente não é tratado como homologação funcional.

| Demanda | Implementação encontrada | Evidência | Situação |
|---|---|---|---|
| Integridade entre chamados, OS, agenda e rotas | Auditoria SQL e filtros de elegibilidade; sincronização de fechamento/cancelamento | Migrations `20261127143000` e `20261127144000` aplicadas; commits `56f17a1`, `5bcec76`, `2ac3d94` | Implementada e publicada; homologação ponta a ponta pendente |
| Cancelamento de chamado elegível | RPC transacional `cancel_ticket`, preservação de histórico e OS vinculadas | Migration `20261117160000`; teste `tests/ticket-cancellation-regression.test.ts`; commit `2bd5ee2` | Implementada; exclusão real em produção não executada nesta verificação |
| Rotas somente com OS elegível | Filtro de estados ativos em Rotas Planejadas | `src/app/(portal)/portal/routes/page.tsx`; commit `5bcec76` | Implementada e publicada |
| Versionamento e rastreabilidade | `/api/version`, metadados de build e rodapé do menu | Endpoint retornou commit `c9dbb6c98a873342e1837bfaa397756b9b0c804c`, ambiente `production`, deployment `oneit-d3210cef60-20261127024500` | Homologada em produção |
| Menu lateral e identidade institucional | Grupos Operação, Financeiro, Serviços e Configurações; textos institucionais atualizados | `src/app/(portal)/layout.tsx`, `src/app/page.tsx`; commit `fa83340` | Publicada; inspeção visual autenticada não executada nesta verificação |
| Combobox de solicitante | Um seletor com busca interna por nome, e-mail e polo | `src/components/tickets/ticket-create-flow.tsx`; commits `f338597` e anteriores | Implementada; E2E autenticado e persistência real não comprovados |
| SLA explícito no formulário | Snapshot automático de política/SLA no backend existente | Regras de SLA encontradas no fluxo de criação | Pendente de implementação do seletor e homologação visual |
| Calendários diário/semanal/mensal | Agenda operacional existente, sem evidência de calendário completo homologado | Código e histórico local | Implementada parcialmente; não homologada |
| Check-in, checkout, geolocalização e RTO | Fluxos e entidades existentes no projeto | Não foi executada jornada autenticada completa nesta sessão | Não homologada |
| Precificação, medição e faturamento | Módulos presentes no repositório | Não foi executado ciclo financeiro real nesta sessão | Não homologada |

## Cadeia de entrega verificada

- Repositório: `https://github.com/felipebuso7/oneit.git`
- Branch: `main`, limpa e alinhada a `origin/main`.
- Commit local/remoto: `c9dbb6c` (`docs: exigir homologacao no dominio oficial`).
- Produção: `https://oneit-omega.vercel.app/`.
- Endpoint: `/api/version` retornou o mesmo commit `c9dbb6c98a873342e1837bfaa397756b9b0c804c`.
- Supabase: migrations locais e remotas iguais até `20261127144000`.

## Gates técnicos executados

- Typecheck: executado; geração de tipos concluída sem erro reportado antes do encerramento do processo.
- Lint de UI: executado sem erro reportado.
- Build: iniciado, mas não concluído dentro do limite desta sessão.
- Testes Vitest: tentados, mas não concluídos dentro do limite desta sessão.
- Deployment: confirmado por resposta pública do endpoint de versão.

## Limitações reais

Não houve, nesta verificação, sessão autenticada de navegador para criar/excluir chamado, executar atendimento de técnico, gerar RTO ou consolidar medição. Esses itens permanecem explicitamente não homologados; não são declarados como aprovados por inspeção de código.
