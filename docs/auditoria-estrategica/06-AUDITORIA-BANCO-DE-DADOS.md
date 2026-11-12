# Auditoria de banco de dados

## Evidências

O schema possui 192 migrations. `organizations` é raiz; `tickets` referencia organização, cliente, contrato, local e técnico (`20260930130000_tickets_foundation.sql`). Há índices para organização/status, contrato/abertura e técnico/agendamento. RLS está habilitado em entidades fundacionais.

No staging `oneit-staging`, as migrations locais `20261028180500_field_service_lpu_compositions.sql` e `20261028210000_field_service_order_lpu_compositions.sql` foram aplicadas durante esta auditoria com autorização do usuário. Isso é staging, não produção.

## Achados

1. O modelo é relacional e possui boa base de integridade, mas a fonte canônica de alguns conceitos históricos precisa ser formalizada.
2. `20261028193000_partner_context_details.sql` usa drop/recreate de função; risco de dependência, embora não apague dados.
3. `db lint --linked --fail-on warning` encontrou warnings em `change_organization_member_role(current_role)` e `transition_measurement_sheet(target_actor)`.
4. Não foi executado teste de restauração nem benchmark de consultas com volume representativo.

## Recomendações seguras

Adicionar constraints/índices somente após medir; criar migrations de compatibilidade; manter soft delete; registrar snapshots de preço; verificar RLS com dois tenants; planejar rollback de funções antes de alterar assinaturas.
