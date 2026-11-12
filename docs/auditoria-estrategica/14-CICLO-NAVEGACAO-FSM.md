# Ciclo de correção — navegação FSM

Data: 29/10/2026.

## Implementado

- `src/app/(portal)/layout.tsx`: Agenda Técnicos aponta a `/portal/scheduling`, não ao portal restrito `/portal/field`. A autorização das páginas permanece inalterada.
- `src/app/(portal)/portal/routes/page.tsx` e `scheduling/page.tsx`: compromissos apontam ao detalhe `/portal/tickets/[id]`, que mantém autenticação e consulta sujeita a RLS. Antes, o parâmetro `?ticket=` era ignorado pela fila.
- `src/lib/navigation/active-link.ts` e `src/components/portal-sidebar-light.tsx`: seleção da rota mais específica. Financeiro não marca simultaneamente Agendamento de OS; LPU não marca também Configurações.
- `tests/portal-navigation.test.ts`: seleção executável de rotas, incluindo caminhos irmãos e ordem inversa, e contratos de destinos.
- `tests/routes-agenda-ui-contract.test.ts`: substituída expectativa anterior que perpetuava o link inválido.

## Validação

- Vitest: 3 arquivos, 14 testes aprovados. Inclui testes unitários e verificações estáticas de contratos; não é E2E.
- Primeira execução bloqueada antes dos testes por EPERM em temporários do sandbox; repetida fora do sandbox com autorização da ferramenta e aprovada.
- TypeScript: `tsc --noEmit` aprovado.
- ESLint dos sete arquivos de implementação/teste deste ciclo: aprovado.
- `git diff --check` aprovado; avisos de normalização LF/CRLF existentes.
- Nenhuma migration ou alteração de dados. Não houve publicação, build de produção ou homologação visual da alteração nesta etapa.

## Pendências seguintes

1. Verificar navegação corrigida em ambiente executando este checkout, incluindo perfis distintos.
2. Projeção comum do estágio e da próxima ação entre chamado, OS, validação e RTO.
3. Separar agendadas de deslocamento/execução nos indicadores e eliminar contagens truncadas.
4. Resolver duração inferida de uma hora na agenda e padronizar fuso.
5. Homologar o escopo comercial do BM antes de consolidar clientes/contratos distintos.

As alterações anteriores do ciclo 1 e o arquivo AGENTS.md já modificado foram preservados. Este registro não declara o sistema pronto para produção.
