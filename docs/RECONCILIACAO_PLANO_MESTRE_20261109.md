# Retomada de coordenação — Plano Mestre OneIT

Data: 2026-11-09  
Escopo: repositório `servicia-fsm`, branch `prep/cloud-staging`, commit vigente `1229b1a`.

## Escopo e divergência de workspace

O workspace também contém o produto IntegraOne/GIntegral na raiz. Suas alterações de UI/UX não são automaticamente alterações do OneIT. Nesta retomada, somente `servicia-fsm` e seus documentos/migrations foram considerados para o Plano Mestre OneIT.

## Estado verificado nesta retomada

- 7 arquivos de testes focados executados.
- 19 testes aprovados.
- Os testes cobrem despacho, técnicos, catálogo, validação, RTO e geração de BM.
- `npx tsc --noEmit --pretty false` foi executado fora do sandbox e passou sem erros. O wrapper `npm run typecheck` permaneceu sem saída conclusiva na primeira tentativa, mas o compilador TypeScript foi validado diretamente.
- Não foi executada homologação autenticada contra o Supabase nesta etapa.
- Não foi comprovada entrega real por WhatsApp/e-mail.

## Matriz única de acompanhamento

| Requisito | Situação real | Evidência | Pendência | Dependência | Prioridade | Critério de aceite | Próxima ação |
|---|---|---|---|---|---|---|---|
| Portal autenticado como fonte operacional | Implementado, não verificado integralmente | `src/proxy.ts`, páginas `/portal`, gates de produção | smoke autenticado e ausência de operação em demo | sessão de homologação | P0 | todas as transições persistem pelo portal | executar smoke autenticado |
| Cadastros mestres e técnicos | Parcialmente implementado | APIs, migrations e contratos de fonte canônica | CRUD real, edição, ativação e seleção no despacho | Supabase acessível | P0 | técnico criado aparece no despacho após reload | testar CRUD e despacho |
| Empresa, localidade, solicitante e serviço | Parcialmente implementado | contratos do catálogo e ticket intake | seleção dependente e persistência em banco real | dados sintéticos | P1 | chamado usa somente entidades da organização | executar sequência de cadastro |
| Despacho e agenda | Implementado em código, não E2E verificado | `dispatch-workspace`, RPC de despacho, testes | conflito, histórico e agenda em banco real | técnico elegível | P1 | OS atribuída, agendada e auditada | executar despacho real de homologação |
| Link público do técnico | Implementado, não verificado integralmente | `partner/access`, token/code gate | expiração, revogação e isolamento | storage e sessão de parceiro | P1 | link acessa somente a OS autorizada | testar tokens e retomada |
| Evidências, materiais e checkout | Implementado em código | upload, materiais LPU, eventos e testes | persistência remota e limites de payload | storage Supabase | P1 | fotos/materiais sobrevivem ao reload e chegam ao RTO | executar OS sintética |
| Validação gerencial | Implementado em código, não E2E verificado | `portal/review`, fila persistente e guards | aprovação/devolução concorrente | submissão persistida | P1 | somente OS elegível é aprovada | testar aprovação e retry |
| RTO | Implementado em código | função `generate_field_service_rto`, PDF e storage | sequência final com horário de fechamento definitivo | decisão transacional RTO→fechamento | P1 | PDF imutável consultável e coerente | homologar geração e consulta |
| BM e fiscal | Parcial | migrations, PDF, totais e workflow | worker, e-mail, retry e entrega real | provedor e competência | P1 | BM não duplica OS e registra envio | testar sandbox financeiro |
| LPU e composição | Parcial | itens e composição existem em código | homologar preço congelado e aplicação única | migrations novas | P1 | quantidade × preço e composição auditáveis | aplicar migrations e testar |
| Segurança multi-organização | Implementado em contratos, não verificado no banco | RBAC/RLS e testes estáticos | matriz real com dois tenants | usuários de teste | P0 | nenhum acesso cruzado | executar matriz RBAC/RLS |
| UI/UX operacional | Parcial | fila, revisão, RTO/BM e shell refinados | homologação visual das rotas autenticadas | navegador/sessão | P2 | tarefas e estados claros sem regressão | revisar fila/despacho/revisão |

## Reconciliação das solicitações paralelas

| Solicitação | Situação | Relação com o Plano Mestre | Recomendação |
|---|---|---|---|
| UI/UX e Design System | Parcial | Onda UX, não substitui fundamentos | incorporar somente onde reduz erro nas jornadas críticas |
| Materiais utilizados pelo técnico | Implementado em código | Completa atendimento e RTO | concluir após migration e smoke remoto |
| Composição LPU | Implementada em código | Completa precificação/BM | manter como P1, sem ampliar escopo antes da homologação |
| PDF BM com padrão RTO | Implementado | Melhoria de relatório | manter e validar visualmente |
| WhatsApp | Preparação de conversa | Integração externa | não declarar entregue sem provedor/entrega confirmada |
| Alterações de menu e nomenclatura | Parcial | UX e arquitetura de informação | consolidar após smoke das rotas canônicas |

## Caminho crítico

1. Conectividade e sessão de homologação Supabase.
2. Aplicação/validação das migrations novas.
3. CRUD de técnicos e cadastros dependentes.
4. Chamado → despacho → link técnico → execução → revisão.
5. RTO persistido → fechamento transacional.
6. BM por competência → PDF → fila de e-mail.
7. Matriz de segurança multi-organização.

## Horizonte de entrega

### Agora — próxima entrega utilizável

- Executar homologação autenticada do fluxo principal com dados fictícios.
- Confirmar migrations `20261030080000`, `20261030081000` e `20261030082000`.
- Fechar o caso prioritário de técnico criado → técnico disponível no despacho.

### Depois — completar MVP

- Validar RTO e fechamento final.
- Validar BM, worker, retry e e-mail em sandbox.
- Executar matriz de RBAC/RLS com duas organizações.

### Futuro — expansão

- Paginação server-side completa nas filas.
- Melhorias visuais secundárias e dashboards.
- Backup/restauração, carga e operação Linux/VPS.

## Decisão de coordenação

A próxima entrega não será uma nova tela. O caminho crítico é homologação de dados e transições no portal autenticado. As melhorias visuais paralelas ficam incorporadas como suporte às jornadas, mas não podem deslocar a validação de persistência, segurança e integração.

## Atualização de execução — 2026-11-09

- `npx tsc --noEmit --pretty false`: aprovado.
- `npx vitest run` focado: 7 arquivos / 19 testes aprovados.
- `npx supabase migration list --linked`: bloqueado por timeout ao criar a login role (`DbConfigLoginRoleStatusError`). Nenhuma migration foi aplicada.

### Validação local adicional — 2026-11-09

- `tests/partner-materials-route.test.ts` e `tests/lpu-composition-application-guard.test.ts`: 2 arquivos / 5 testes aprovados.
- `tests/measurement-pdf-route-contract.test.ts`, `tests/measurement-pdf-visual.test.ts` e `tests/field-service-rto-render.test.ts`: 3 arquivos / 4 testes aprovados.
- Os resultados comprovam os contratos locais de materiais, composição LPU e renderização/contrato dos PDFs; ainda não comprovam persistência no Supabase remoto, upload em storage ou entrega de e-mail.
- O próximo bloqueio objetivo permanece a homologação autenticada após confirmar as migrations no projeto remoto.
- Reexecução da suíte contratual crítica (`field-service-end-to-end`, review, RTO, BM, técnico, catálogo e despacho): 7 arquivos / 19 testes aprovados.
- Fronteira de produção (`production-persistence-boundary`, gate/isolation de demo e operational paths): 4 arquivos / 15 testes aprovados. O portal operacional não usa `localStorage` como persistência; as ocorrências encontradas permanecem restritas ao namespace `/demo` ou ao estado visual da sidebar.
- Prontidão, atualização de técnico, navegação, contexto da revisão e progresso do chamado: 6 arquivos / 49 testes aprovados.
- Suíte completa após correção da fila de validação: 161 arquivos / 383 testes aprovados. A correção foi limitada ao contador explícito da fila oficial e não alterou regras de negócio.

