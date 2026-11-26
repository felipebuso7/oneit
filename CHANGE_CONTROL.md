# Controle de mudanças de escopo

Toda nova solicitação recebe um ID e passa por esta triagem antes de virar compromisso:

1. Benefício e problema operacional.
2. Módulos e dados afetados.
3. Complexidade e dependências.
4. Risco de regressão e segurança.
5. Impacto no roadmap e release.
6. Necessidade de decisão de negócio.
7. Critério de aceite e evidência esperada.

## Decisões

- **Aprovada:** entra em `MASTER_BACKLOG.csv` com prioridade, dependências e status READY.
- **Condicionada:** permanece BLOCKED_DEPENDENCY até decisão/credencial.
- **Não aprovada/futura:** registrada em `SCOPE_BASELINE.md`, sem implementação.
- **Urgente P0/P1:** pode interromper a fila, mas exige registro de risco e rollback.

Não é permitido converter uma oportunidade em requisito concluído apenas por estar descrita em uma solicitação.
