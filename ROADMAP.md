# ONEIT — Roadmap executivo por releases

Este roadmap é orientado por dependências e gates. Não contém datas ou estimativas de capacidade.

## Release R1 — Fundação operacional estabilizada

**Objetivo:** garantir cadastros, chamados, OS, execução técnica e fila de validação.

**Escopo:** correções P0/P1 do fluxo técnico; migrations; autorização; RLS; testes de regressão.

**Dependências:** ambiente E2E autorizado (`QA-001`, `MTX-001`).

**Aceite:** técnico conclui atendimento, gestor aprova/devolve, dados persistem após reload.

**Gates:** lint, typecheck, build, testes, migrations, RLS e E2E autenticado.

**Publicação:** somente com smoke test e commit confirmados.

## Release R2 — Integridade financeira

**Objetivo:** ligar OS/RTO a LPU e BM sem cobrança indevida.

**Escopo:** quilometragem calculada, aprovada e faturada separadas; aprovação transacional; idempotência; snapshots.

**Dependências:** `FIN-001`, R1 concluída e decisão contratual.

**Aceite:** somente deslocamentos aprovados entram no BM; históricos não mudam após reajuste de LPU.

**Gates:** precisão monetária, concorrência, duplicidade, integração BM e auditoria.

## Release R3 — Prontidão produtiva

**Objetivo:** comprovar deployment, observabilidade, backup e operação piloto.

**Dependências:** `GOV-001`, `OPS-001`, `QA-001`.

**Aceite:** versão, domínio, logs, health check, rollback e smoke test comprovados.

## Release R4 — Evolução controlada

**Objetivo:** tratar calendário, BI e automações após estabilização.

**Dependências:** releases anteriores e decisões de negócio (`CAL-001`, `BI-001`).

**Condição:** itens não entram no compromisso atual sem aprovação no controle de mudanças.
