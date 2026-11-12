# OneIT — backlog priorizado

## P0

- Nenhum P0 novo comprovado neste lote.

## P1

- Executar E2E autenticado do ciclo chamado → agendamento → técnico → validação → RTO/BM. Contratos automatizados aprovados; validação dinâmica ainda pendente. **Smoke autenticado em produção confirmado em 12/11/2026:** `/portal/review` carregou 2 OS aprovadas, uma com RTO pendente e outra com RTO baixável/encerramento disponível; isso não substitui o ciclo completo.
- Confirmar em ambiente autenticado que os filtros de organização não expõem dados entre tenants.
- Validar tecnicamente upload de evidências e armazenamento do RTO com dados sintéticos. Contratos automatizados aprovados; endpoint de prontidão de produção respondeu `200 {status:"ready", deploymentMode:"supabase"}` em 12/11/2026, mas ainda falta um upload sintético real autenticado.

## P2

- Revisar visualmente todas as telas operacionais em viewport estreito. **Achado estático adicional:** há 40+ rotas administrativas legadas sem `OneitPageHeader`; a migração visual deve ser feita por ondas, começando pelas rotas de operação já priorizadas, sem alterar contratos de negócio.
- Consolidar tokens e estados de tabelas, filtros, formulários e mensagens.
- ~~Comparar dados cadastrais de LPU com o tipo exibido na interface.~~ **Verificado neste lote:** API, UI e migrations usam `kind`, `unit`, `unit_price`, vigência e `active` de forma consistente; 14 testes de CRUD/composição/validação aprovados.

## P3

- Refinar microcopy e estados vazios após a regressão operacional.

## Regra de conclusão

Item só passa a concluído com alteração identificável, teste/validação executado e evidência registrada.
