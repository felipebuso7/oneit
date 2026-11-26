# ONEIT — Relatório executivo de stage gates

Referência: 2026-11-26. Classificação: Verde = evidência completa; Amarelo = parcial/bloqueado não crítico; Vermelho = impedimento de go-live.

## Situação geral

**Vermelho para Go-live.** Há bloqueios externos de homologação/deployment e a aprovação financeira de deslocamento ainda não está modelada.

## Frentes

| Frente | Situação | Evidência |
|---|---|---|
| Engenharia e banco | Amarelo | 219 migrations auditadas; testes locais registrados |
| Operação | Amarelo | fluxo implementado, E2E real bloqueado |
| Financeiro | Vermelho | `FIN-001` pendente |
| Produção | Vermelho | `GOV-001` e `OPS-001` bloqueados |
| Aceite humano | Amarelo | nenhum aceite registrado |

## Decisões necessárias

- Definir quantidade aprovada de deslocamento e regra contratual.
- Disponibilizar credenciais/tenants para QA e acesso Vercel.
- Registrar aceite humano após UAT.

## Próximo marco

Desbloquear `FIN-001`, `QA-001` e `GOV-001`; então repetir os gates 04–08.
