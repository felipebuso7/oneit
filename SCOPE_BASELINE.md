# ONEIT — Baseline de escopo (v1)

## Compromisso da versão atual

- Cadastros mestres multi-tenant.
- Chamados, despacho, agendamento e ordens de serviço.
- Execução técnica com eventos, evidências e assinatura.
- Fila de validação gerencial com aprovação/devolução.
- RTO versionado e armazenamento privado.
- LPU e geração de BM para OS elegíveis e encerradas.

## Correções em andamento

- P1: confirmação de deployment, E2E real e homologação móvel (`GOV-001`, `QA-001`, `MTX-001`).
- P1: separar quilometragem aprovada da calculada antes da medição (`FIN-001`).

## Melhorias e dívidas técnicas

- `CAL-001`, `OPS-001` e `BI-001` permanecem fora do compromisso imediato por dependência registrada.
- Integração de rotas rodoviárias permanece futura até existir provedor e credencial autorizados.

## Fora do escopo sem aprovação

Novos módulos, automações financeiras, provedores pagos, rastreamento contínuo, alterações destrutivas de dados e mudanças de regra comercial não entram automaticamente no produto.

## Estados de conclusão

IMPLEMENTADO ≠ TESTADO ≠ HOMOLOGADO_TECNICAMENTE ≠ PUBLICADO ≠ VALIDADO_PROD ≠ ACEITO_HUMANAMENTE. Cada estado exige evidência própria na matriz de requisitos.
