# OneIT — padrão de UI/UX operacional

## Direção adotada

O OneIT deve parecer um produto operacional maduro: limpo, branco, direto e rápido de navegar. A referência é a **clareza estrutural** observada nos exemplos fornecidos — não suas marcas, textos ou componentes.

## Regras obrigatórias

- Fundo claro e superfícies brancas; usar azul-marinho OneIT para navegação, contexto e ações institucionais, e laranja somente para chamar atenção ou ação prioritária.
- Navegação lateral persistente, agrupada por domínio, com ícones e rótulos; em telas menores, colapsável.
- Topo discreto com contexto da organização, busca/atalhos e perfil. Não repetir navegação em excesso.
- Listagens operacionais usam tabela: busca, filtros, contador de resultados, paginação, estados vazios e ações em lote ou contexto quando fizer sentido.
- Linhas selecionadas usam destaque suficiente sem esconder os dados. Status usa texto + cor + ícone/sinal, nunca cor isolada.
- Telas de detalhe usam resumo no topo e abas ou seções curtas. Edição extensa abre painel lateral, preservando a lista em segundo plano; modais são reservados a confirmações curtas.
- Ação primária é única e clara; ações destrutivas permanecem secundárias e pedem confirmação contextual.
- Formulários agrupam campos por intenção, com validação junto ao campo e linguagem simples em português.
- Dashboards explicam período, fonte e regra de cálculo; cartões são indicadores, não decoração.
- Desktop é denso sem ser poluído; mobile prioriza fila, busca, detalhes e ações de campo.

## Critérios de aceite visual

1. Usuário consegue identificar onde está, a ação principal e o estado da informação em poucos segundos.
2. Tabelas mantêm leitura confortável em 1366px e têm alternativa responsiva.
3. Nenhuma ação crítica depende só de hover, cor ou ícone.
4. Estado vazio orienta o próximo passo; falhas explicam a ação possível.
5. Componentes reutilizam tokens de cor, espaçamento, bordas e tipografia do OneIT.

## Aplicação gradual

O portal atual será migrado incrementalmente, começando por: shell autenticado, fila de chamados, inventário/ativos, detalhes em painel lateral, filtros e dashboard operacional. Não fazer uma refatoração visual ampla sem uma sprint dedicada.
