<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Diretriz permanente de UI/UX — OneIT

Toda nova tela ou alteração visual deve seguir o padrão operacional do OneIT: interface clara e predominantemente branca; navegação lateral compacta e consistente; cabeçalho discreto; hierarquia tipográfica objetiva; ações principais evidentes; filtros próximos às listas; tabelas com densidade equilibrada, cabeçalho fixo quando necessário e estados legíveis; formulários longos em painel lateral ou etapas curtas; feedback imediato para carregamento, vazio, sucesso e erro.

Evitar painéis excessivos, decoração sem função, dashboards genéricos, menus extensos sempre expandidos, jargão desnecessário e fluxos burocráticos. Priorizar leitura rápida, poucos cliques, responsividade, teclado, contraste e acessibilidade. Referências visuais externas servem apenas para direção de experiência; nunca copiar marcas, conteúdo ou componentes proprietários.

## Diretriz permanente de domínio — OneIT

Tratar o produto como sistema conectado de cadastros mestres. Nenhuma tela operacional deve duplicar empresa, departamento, colaborador, tipo de ativo, categoria, subcategoria, SLA/OLA, contrato ou fornecedor em texto livre quando existir uma entidade mestre. Cadastros administrativos pertencem a Configurações e devem respeitar organização, permissões e histórico. Consultar `docs/master-data-and-administration.md` antes de criar ou alterar entidades relacionadas.
