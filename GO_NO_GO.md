# ONEIT — Controle Go/No-Go

## Regra

- **GO:** todos os gates técnicos obrigatórios verdes e sem aprovação humana pendente.
- **GO CONDICIONAL:** somente com risco residual explicitamente aceito pelo responsável identificado.
- **NO-GO:** impedimento crítico, falha de integridade/segurança ou deployment não confirmado.
- **AGUARDANDO APROVAÇÃO HUMANA:** critérios técnicos podem estar atendidos, mas falta aceite formal.

## Estado atual

| Release | Decisão | Motivo |
|---|---|---|
| R1 Fundação | GO CONDICIONAL | Testes locais e migrations auditadas; homologação real pendente |
| R2 Financeiro | NO-GO | `FIN-001` não implementado |
| R3 Produção | NO-GO | `GOV-001`/`OPS-001` bloqueados |
| Go-live | NO-GO | Gates 04–08 não aprovados |

Nenhuma aprovação humana foi simulada.
