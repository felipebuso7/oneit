# Changelog

## Release Candidate `2026.11.25-rc.1`

### Incluído

- Endurecimento de cabeçalhos HTTP e propagação de `x-request-id`.
- Logs estruturados para falhas do worker de outbox, com filtragem de segredos.
- Documentação operacional de health/readiness, rollback, backup e limitações de continuidade.
- Catálogo rastreável de indicadores operacionais e regras de BI.
- Estratégia de qualidade, gates de CI e matriz de cobertura por risco.
- Índices para consultas da fila operacional.

### Validação

- Branch `main` limpa e sincronizada com o repositório remoto no commit desta RC.
- Workflow de CI inclui lint, typecheck, testes, build, auditoria de dependências, migrations estritas e build de container.
- Execuções locais de lint e typecheck nesta sessão não produziram saída conclusiva dentro do limite de execução do ambiente; não são reportadas como aprovadas.

### Pendências antes do aceite de produção

- Smoke test pós-deploy e associação ao domínio precisam de confirmação no Vercel.
- E2E visual, RLS bilateral remoto e restauração real de backup dependem de ambiente/credenciais autorizados.
- RPO/RTO ainda não medidos empiricamente.
