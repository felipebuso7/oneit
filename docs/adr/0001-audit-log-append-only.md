# ADR 0001 — Audit log append-only com hash por evento

## Contexto

O sistema já registrava eventos em `audit_logs`, porém sem bloqueio explícito de mutação e sem marca de integridade.

## Decisão

Bloquear atualização e exclusão por trigger de banco e calcular SHA-256 no `INSERT`. Preservar `correlation_id`, valores anterior/posterior e origem existentes; acrescentar resultado e motivo quando aplicável.

## Alternativas

- Apenas RLS: insuficiente, pois acessos privilegiados podem contornar políticas.
- Hash encadeado por organização: maior evidência de ordenação, mas introduz contenção e precisa de estratégia transacional adicional.
- Serviço externo de auditoria: posterior, dependente de retenção e observabilidade contratadas.

## Consequências

Correções não alteram o evento original; devem gerar novo evento. Rotinas de manutenção não podem limpar a tabela sem procedimento de retenção aprovado.

## Riscos

O hash não impede remoção física por um administrador da infraestrutura. Backup, retenção externa e monitoramento continuam necessários.
