# Matriz de testes

Consulte [docs/QUALITY_STRATEGY.md](docs/QUALITY_STRATEGY.md). O gate CI em `.github/workflows/quality.yml` executa lint, typecheck, testes, build, migrations estritas, auditoria de dependências e build de container. E2E remoto, RLS bilateral e restauração só podem ser marcados como aprovados com evidência executada.
