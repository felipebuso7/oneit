# ONEIT — Gates permanentes de qualidade

| Gate | Verificação | Evidência mínima | Bloqueia release |
|---|---|---|---|
| Código | lint e revisão de diff | logs sem erros; sem segredos | Sim |
| Tipos/build | typecheck e build | saída 0 | Sim |
| Banco | auditoria de migrations e DB fresh | `audit:migrations:strict`; `audit:billing-db` | Sim |
| Testes | unitários, integração e regressão | suíte executada | Sim para falhas críticas |
| Segurança | npm audit, RLS e autorização | relatório e testes negativos | Sim |
| Integração | contratos API, Storage e jobs | testes de contrato | Sim |
| UX/UI | estados principais e responsividade | evidência visual | Não, salvo bloqueio operacional |
| Homologação | fluxo autorizado em ambiente real | usuário, tenant e evidência | Sim para go-live |
| Produção | smoke, versão e health | URL, commit e logs | Sim para declarar publicado |

O pipeline `.github/workflows/quality.yml` é a execução automatizada dos gates de código, banco, testes e build. Nenhum resultado deve ser ignorado ou mascarado.
