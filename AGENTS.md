<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Diretriz permanente de UI/UX — OneIT

Toda nova tela ou alteração visual deve seguir o padrão operacional do OneIT: interface clara e predominantemente branca; navegação lateral compacta e consistente; cabeçalho discreto; hierarquia tipográfica objetiva; ações principais evidentes; filtros próximos às listas; tabelas com densidade equilibrada, cabeçalho fixo quando necessário e estados legíveis; formulários longos em painel lateral ou etapas curtas; feedback imediato para carregamento, vazio, sucesso e erro.

Evitar painéis excessivos, decoração sem função, dashboards genéricos, menus extensos sempre expandidos, jargão desnecessário e fluxos burocráticos. Priorizar leitura rápida, poucos cliques, responsividade, teclado, contraste e acessibilidade. Referências visuais externas servem apenas para direção de experiência; nunca copiar marcas, conteúdo ou componentes proprietários.

## Diretriz permanente de domínio — OneIT

Tratar o produto como sistema conectado de cadastros mestres. Nenhuma tela operacional deve duplicar empresa, departamento, colaborador, tipo de ativo, categoria, subcategoria, SLA/OLA, contrato ou fornecedor em texto livre quando existir uma entidade mestre. Cadastros administrativos pertencem a Configurações e devem respeitar organização, permissões e histórico. Consultar `docs/master-data-and-administration.md` antes de criar ou alterar entidades relacionadas.

## Governança permanente de engenharia

Antes de alterar código, inspecione a implementação, banco, rotas, permissões e testes existentes. Preserve funcionalidades e dados; reutilize componentes e o Design System; evite duplicidades, dados fictícios, sucesso artificial, mocks em produção, regras de negócio inventadas e qualquer forma de mascarar falhas.

Toda operação deve ter persistência real, autorização no backend, isolamento multi-tenant, credenciais protegidas e migrations versionadas e seguras. Teste antes de publicar, registre evidências, atualize documentação e backlog, use commits rastreáveis e confirme o deployment efetivo. Respeite o limite de autorização; não faça exclusões destrutivas nem publique mudanças arriscadas sem validação. Não encerre uma tarefa executável apenas com recomendações.

### Definition of Ready

- Escopo, usuário afetado e critério de aceite definidos.
- Fluxo e regras existentes localizados no código/documentação.
- Impacto em schema, RLS, APIs, UI e dados identificado.
- Dependências, riscos e estratégia de teste registradas no backlog.

### Definition of Done

- Implementação mínima concluída sem regressão conhecida.
- Persistência, autorização e isolamento verificados.
- Testes pertinentes executados; falhas e limitações registradas.
- Interface validada nos estados carregando, vazio, erro e sucesso quando aplicável.
- Documentação, backlog, changelog e evidências atualizados.
- Commit rastreável criado; deployment confirmado ou bloqueio externo documentado.

### Protocolo de homologação operacional

Durante a homologação, cada correção deve reproduzir o defeito, comprovar a causa, implementar a solução, executar regressão, validar persistência e módulos consumidores, versionar e confirmar o deployment. Não declarar sucesso ou publicação sem evidência verificável; bloqueios externos devem ser registrados sem interromper atividades independentes.

### Continuidade entre sessões

Ao iniciar uma atividade, consulte `MASTER_PLAN.md`, `BACKLOG.md` e os documentos especializados listados nesses índices. Ao concluir, atualize o status e as evidências no backlog e no documento de domínio correspondente. Bloqueios externos devem conter causa objetiva e ação mínima necessária, sem impedir trabalho independente.

### Governança PMO

Para atividades de projeto, consulte também `PMO_MASTER_PLAN.md`, `PROJECT_CHARTER.md`, `MASTER_BACKLOG.csv`, `WBS.csv`, `REQUIREMENTS_MATRIX.csv`, `RISK_REGISTER.csv`, `DEPENDENCY_MATRIX.csv`, `DECISION_LOG.md`, `CHANGE_REGISTER.md`, `RELEASE_REGISTER.md` e `EXECUTIVE_STATUS.md`. Esses registros são a fonte oficial de rastreabilidade entre requisito, tarefa, evidência, commit, release e aceite. Atualize os registros afetados ao finalizar uma atividade; nunca invente responsáveis, percentuais, aceite humano ou status de publicação.

Stage gates, relatórios executivos e decisões Go/No-Go devem permanecer em `STAGE_GATES.csv`, `EXECUTIVE_REPORT.md` e `GO_NO_GO.md`. Nenhum gate dependente de aprovação humana pode ser marcado como aprovado sem registro do responsável e da decisão.

## Diretriz permanente de execução

Prompts encaminhados pelo responsável contendo missões, requisitos, correções, auditorias, testes ou implementações são solicitações de execução, salvo indicação expressa de que sejam apenas informativos. Não solicitar confirmações redundantes para atividades claramente autorizadas.

Para diagnóstico, correção, melhoria ou validação, executar o ciclo investigação → implementação → testes → correção → evidência. Não encerrar com recomendações quando a implementação estiver dentro do escopo. Após cada atividade, avançar para pendências autorizadas, respeitando prioridades e dependências.

Utilizar as ferramentas disponíveis para inspecionar arquivos, modificar código, executar comandos, testar integrações, atualizar documentação, manter o backlog e registrar o ponto de continuidade. Se faltar autorização técnica, credencial ou decisão de negócio, solicitar somente o elemento indispensável e continuar tarefas independentes.

Preservar segurança, integridade de dados, regras de negócio e controles de autorização. Não realizar operações destrutivas, expor credenciais ou contornar restrições. Não declarar conclusão sem evidências, nem publicação sem confirmar deployment e versão efetivamente disponibilizada. Quando houver ordem explícita de execução, iniciar diretamente sem perguntar se deve executar.

## Diretriz permanente de remediação, qualidade e execução

Toda solicitação de implementação, correção ou melhoria é uma solicitação de execução efetiva, salvo indicação explícita de que o objetivo é somente análise ou planejamento.

Não considerar concluída uma entrega que tenha apenas código escrito, interface sem integração, botão sem ação, endpoint sem validação, formulário sem persistência, teste não executado, commit não publicado ou push sem deployment quando a implantação tiver sido solicitada.

O ciclo obrigatório é: diagnosticar → implementar → testar → corrigir → validar → versionar → publicar → verificar.

Falhas relevantes devem ser registradas no backlog oficial. Problemas diretamente relacionados à tarefa devem ser corrigidos durante sua execução; problemas fora do escopo devem ser classificados e encaminhados à frente responsável.

Preservar estabilidade, integridade dos dados e segurança. Refatorações exigem justificativa técnica, testes e estratégia de recuperação. Decisões técnicas rotineiras devem ser resolvidas autonomamente; impedimentos externos devem ser registrados objetivamente sem interromper atividades independentes.

Toda conclusão deve possuir evidência verificável: testes, evidências visuais, logs, commits, migrations, consultas, versão, deployment ou smoke tests. Diferenciar sempre implementado, testado, homologado, publicado e bloqueado.

Antes de iniciar qualquer tarefa, consultar este arquivo, o backlog oficial e os registros de execução. Não reiniciar atividades concluídas nem ignorar pendências críticas. Nunca inventar testes, métricas, resultados, acessos, evidências ou publicações. Quando houver implantação solicitada, executar o procedimento oficial somente após os gates aplicáveis e confirmar a versão efetivamente publicada.
