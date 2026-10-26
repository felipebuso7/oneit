# Auditoria 360° do OneIT

Auditoria iniciada em 2026-10-25 com base no repositório local.

## Ordem de leitura

1. [Inventário funcional](./01_INVENTARIO_FUNCIONAL_ONEIT.md)
2. [Jornadas de usuários](./02_JORNADAS_USUARIOS.md)
3. [Mapa de integrações](./03_MAPA_INTEGRACOES.md)
4. [Auditoria UI/UX](./04_AUDITORIA_UI_UX.md)
5. [Auditoria de processos](./05_AUDITORIA_PROCESSOS.md)
6. [Auditoria de cadastros](./06_AUDITORIA_CADASTROS.md)
7. [Auditoria de indicadores](./07_AUDITORIA_INDICADORES.md)
8. [Auditoria de workflows](./08_AUDITORIA_WORKFLOWS.md)
9. [Matriz E2E](./09_MATRIZ_TESTES_E2E.md)
10. [Backlog](./10_BACKLOG_MELHORIAS.md)
11. [Maturidade](./11_MATURIDADE_ONEIT.md)
12. [Relatório executivo](./12_RELATORIO_EXECUTIVO_INICIAL.md)
13. [Matriz de segurança das APIs](./13_MATRIZ_SEGURANCA_APIS.md)
14. [Plano de ciclos](./14_PLANO_CICLOS.md)

## Classificação das evidências

- **Confirmado no código:** encontrado por inspeção de rotas, serviços, migrations ou testes.
- **Confirmado por teste automatizado:** executado e aprovado no ambiente local.
- **Pendente de homologação:** depende de PostgreSQL, VPS, navegador, dispositivo ou provedor externo.
- **Hipótese de UX:** requer observação com usuário ou teste visual; não deve ser tratada como defeito confirmado.

## Próximo ciclo aprovado

1. Configurar banco de homologação isolado.
2. Executar matriz de duas organizações e testar RLS/grants.
3. Executar jornada Field Service ponta a ponta.
4. Validar worker de e-mail e provedor sandbox.
5. Medir tempo de resposta e carga representativa.

Nenhuma migration destrutiva ou integração externa deve ser alterada antes dessas evidências.

## Verificação local antes do banco

```bash
npm run audit:migrations
```

Em 25/10/2026, a verificação encontrou 162 arquivos e um prefixo duplicado (`20261024120000`), sem operações `DROP` detectadas.
