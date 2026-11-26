# ONEIT — Release Management

## Rastreabilidade obrigatória

`Requisito → Backlog/WBS → Código/migration → Teste → Commit → Build → Release Register → Deployment → Smoke test → Aceite humano`.

## Fluxos

- **Planejada:** todos os gates aprovados, changelog e checklist atualizados.
- **Hotfix:** somente P0/P1 comprovado, diff mínimo, testes direcionados, rollback definido e revisão posterior.
- **Migration:** aditiva, versionada, auditada em banco fresh e com plano de recuperação; sem DROP indiscriminado.
- **Rollback:** registrar commit anterior, impacto de schema e procedimento aprovado antes da publicação.

## Estados

IMPLEMENTADO, TESTADO, HOMOLOGADO_TECNICAMENTE, PUBLICADO, VALIDADO_PROD e ACEITO_HUMANAMENTE são estados distintos. A ausência de evidência mantém o estado anterior.
