# ONEIT — Caminho crítico

## Sequência essencial

1. Cadastros mestres e contratos íntegros.
2. Serviços/LPU vigentes.
3. Chamado e OS relacionados ao tenant correto.
4. Agenda, despacho e técnico autorizado.
5. Deslocamento/check-in/execução/check-out persistidos.
6. Validação gerencial com auditoria.
7. RTO versionado e privado.
8. Aprovação financeira do deslocamento (`FIN-001`).
9. BM idempotente e baseado em snapshots.
10. Deployment e homologação produtiva (`GOV-001`, `QA-001`, `MTX-001`).

## Bloqueadores atuais

| ID | Tipo | Impede | Próxima ação |
|---|---|---|---|
| FIN-001 | Dependência de negócio/modelagem | BM de deslocamento aprovado | Definir regra contratual e persistência da quantidade aprovada |
| QA-001 | Externo | E2E/RLS bilateral | Disponibilizar dois tenants e credenciais autorizadas |
| MTX-001 | Externo | Homologação móvel real | Disponibilizar dispositivo/navegador e sessão de teste |
| GOV-001 | Externo | Confirmação de produção | Disponibilizar acesso ao Vercel/domínio |

## Itens fora do caminho crítico

`CAL-001`, `BI-001` e `OPS-001` não devem interromper a estabilização operacional; permanecem registrados como dependências posteriores.

## Pontos de controle

Cada pacote só avança quando seus testes, persistência, autorização, migration e evidências estiverem registrados no backlog e na matriz de requisitos.
