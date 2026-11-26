# Estratégia de qualidade do ONEIT

## Estado verificado

- 176 arquivos de teste e 562 blocos `describe/it` foram encontrados no repositório em 25/11/2026.
- O workflow `.github/workflows/quality.yml` executa auditoria de dependências, árvore de release, migrations estritas, lint por domínio, typecheck, Vitest, build e build de container.
- Há um job separado para aplicar migrations em banco Supabase local descartável e auditar privilégios financeiros.

## Gates obrigatórios

Pull requests e pushes para `main` e `prep/cloud-staging` devem passar pelo workflow `Quality`. Falhas em lint, typecheck, testes, build, auditoria de migrations ou vulnerabilidades altas do npm bloqueiam a promoção.

## Cobertura por risco

| Área | Evidência atual | Lacuna conhecida |
|---|---|---|
| LPU, materiais e cálculo | Testes unitários e contratos de API | E2E com banco remoto exige credenciais de ambiente de teste |
| Financeiro, BM e e-mail | Testes de idempotência, lock, PDF e fila | Provedor de e-mail real não deve ser acionado em CI |
| Multi-tenant/RLS | Contratos de código e migrations | Teste bilateral remoto depende de dois usuários autorizados |
| Autenticação e autorização | Testes de rotas e RBAC | Navegador E2E completo depende de ambiente executável |
| UI e responsividade | Contratos e artefatos visuais existentes | Não há execução Playwright obrigatória no workflow atual |
| Concorrência/idempotência | Testes de locking e contratos SQL | Carga progressiva não é executada em produção |

## Dados sintéticos

Os testes devem usar organizações, usuários, contratos, chamados e itens LPU sintéticos; nunca credenciais ou dados reais. Testes de integração devem apontar para banco descartável ou ambiente explicitamente autorizado.

## Limitações honestas

Não declarar cobertura E2E, RLS bilateral ou restauração de backup como aprovadas sem executar contra o ambiente correspondente. Mocks são aceitos somente em unidade; não substituem persistência real.
