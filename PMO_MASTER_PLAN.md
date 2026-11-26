# ONEIT — PMO Master Plan

## Objetivo

Estabelecer uma fonte única de governança para escopo, qualidade, riscos, dependências, releases e homologação do ONEIT.

## Fontes oficiais

- Escopo e continuidade: [MASTER_PLAN.md](MASTER_PLAN.md)
- Execução e pendências: [MASTER_BACKLOG.csv](MASTER_BACKLOG.csv) e [BACKLOG.md](BACKLOG.md)
- Arquitetura: [ARCHITECTURE.md](ARCHITECTURE.md)
- Regras: [BUSINESS_RULES.md](BUSINESS_RULES.md)
- Segurança: [SECURITY.md](SECURITY.md)
- Testes: [TEST_MATRIX.md](TEST_MATRIX.md)
- Releases: [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) e [RELEASE_REGISTER.md](RELEASE_REGISTER.md)
- Baseline e mudanças: [SCOPE_BASELINE.md](SCOPE_BASELINE.md) e [CHANGE_CONTROL.md](CHANGE_CONTROL.md)
- Roadmap e caminho crítico: [ROADMAP.md](ROADMAP.md) e [CRITICAL_PATH.md](CRITICAL_PATH.md)
- Qualidade e releases: [QUALITY_GATES.md](QUALITY_GATES.md) e [RELEASE_MANAGEMENT.md](RELEASE_MANAGEMENT.md)
- Stage gates e Go/No-Go: [STAGE_GATES.csv](STAGE_GATES.csv), [EXECUTIVE_REPORT.md](EXECUTIVE_REPORT.md) e [GO_NO_GO.md](GO_NO_GO.md)

## Governança

Cada entrega deve possuir ID, critério de aceite, dependências, evidência, status e commit. Status possíveis: READY, IN_PROGRESS, BLOCKED_EXTERNAL, BLOCKED_DEPENDENCY, DONE. Aprovação humana e aceite de negócio só podem ser marcados com evidência explícita.

## Cadência e gates

1. Reproduzir e delimitar.
2. Implementar com persistência e autorização.
3. Testar e corrigir regressões.
4. Auditar migrations e segurança.
5. Versionar e publicar somente após os gates.
6. Executar smoke test e registrar a versão efetiva.

## Critérios executivos

Os indicadores em `EXECUTIVE_STATUS.md` são contagens rastreáveis dos registros oficiais; não representam percentual de maturidade nem aceite humano.

## Ponto de continuidade

Última versão local registrada: commit `fd4bb69`. Pendências bloqueadas permanecem no `BACKLOG.md`; a próxima atividade deve selecionar o item READY de maior prioridade após consultar este documento.
