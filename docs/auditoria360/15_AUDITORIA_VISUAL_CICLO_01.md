# Auditoria visual OneIT — ciclo 01

Data: 25/10/2026. Escopo: reconhecimento global do código e inspeção visual de rotas representativas em janela de aproximadamente 744 px. Este documento não declara todas as telas homologadas.

## Fatos verificados

- `src/app` contém 153 arquivos `page.tsx`: 76 em `demo`, 73 em `(portal)`, 3 em `(auth)` e 1 na raiz. A contagem não inclui rotas de API.
- Em 69 páginas há a classe `ml-64`; em 94 páginas há ao menos uma cor hexadecimal local; 78 páginas contêm classes laranja ou a cor `#f36c21`. Esses são indicadores de dispersão visual, não prova de defeito em cada página.
- Há duas implementações de `OneitPageHeader` e duas de `OneitStatusBadge` em `src/components`, além de cabeçalhos escritos diretamente nas páginas.
- Foram renderizadas no navegador integrado: Dashboard, Chamados, fila Field, Agenda e rotas, Cadastros Field, BM e faturamento, mobile do técnico e Login. A janela inspecionada é estreita; desktop amplo e dispositivos físicos não foram validados.

## Achados por superfície observada

| Superfície | Evidência visual | Impacto | Prioridade |
|---|---|---|---|
| Menu demo | Ao abrir em tela estreita, o menu ocupa cerca de 500 px de altura e empurra a tarefa para baixo. O logo aparece pequeno. Ícones são glifos de fontes diferentes. | Navegação interrompe a tarefa e transmite pouca consistência. | P1 |
| Dashboard | Um bloco escuro de apresentação antecede os indicadores; cinco cartões e um segundo bloco repetem o contexto da competência. | Leitura operacional exige rolagem e interpretação adicional. | P2 |
| Chamados | Barra de ações com nove comandos quebra em duas linhas; tabela densa exige rolagem horizontal em 744 px. | A ação principal e a próxima ação ficam menos claras. | P1 |
| Detalhe de Chamados | O painel do chamado abre com nove abas distribuídas em duas linhas e um formulário extenso; a ação principal fica no cabeçalho e salvar/fechar no rodapé. | Orientação dentro do atendimento continua difícil, apesar da abertura da linha ter sido simplificada. | P1 |
| Agenda e rotas | Bloco introdutório grande, aviso e cartão de seleção de data aparecem antes da agenda, que está vazia no ambiente observado. | A decisão sobre disponibilidade fica abaixo de explicações. | P1 |
| Cadastros Field | Bloco introdutório, métricas e cartões altos afastam os cadastros acionáveis. | O administrador precisa rolar para chegar ao trabalho. | P2 |
| BM e faturamento | Repete bloco escuro de apresentação, aviso, controles e métricas empilhadas. | A sequência de fechamento perde prioridade visual. | P1 |
| Técnico mobile | A sequência da OS está legível na janela inspecionada, mas usa várias caixas e cores diferentes da plataforma. | Precisa de teste no telefone e revisão de densidade sem alterar o fluxo. | P2 |
| Login | Superfície quase preta e botão ciano destoam da identidade azul/cinza observada na operação. | Experiência de entrada parece produto diferente. | P2 |

## Causa raiz provável e limites da conclusão

A interface foi ampliada por página, com estilos e cabeçalhos locais, enquanto os componentes compartilhados permanecem pouco adotados. A duplicidade de componentes é fato do código; a relação causal exata com todos os problemas visuais é uma inferência. Não há evidência suficiente para declarar defeitos em rotas que não foram renderizadas.

## Padrão proposto

1. Um shell consistente: menu compacto, logo legível, grupos curtos e área principal sem sobreposição.
2. Cabeçalho de página com título, contexto curto e no máximo uma ação primária.
3. Ferramentas de busca e filtro junto à lista; comandos secundários em contexto.
4. Superfícies predominantemente brancas, cinza claro e azul OneIT; laranja reservado a ações pontuais que exigem destaque.
5. Espaçamentos em escala de 4 px; controles com área acionável de ao menos 40 px no desktop e 44 px no mobile.
6. Tabelas nas tarefas de volume; painéis laterais quando a decisão precisa de detalhe. Evitar cartões apenas decorativos.
7. Estados vazio, carregando, erro e sucesso visíveis e específicos à tarefa.

## Plano controlado

- **Ciclo 01 — shell e navegação:** corrigir menu mobile que desloca conteúdo, padronizar ícones, aumentar a legibilidade do logo e estabelecer tokens de navegação. Validar fila, dashboard e menu aberto/fechado em janela estreita.
- **Ciclo 02 — telas operacionais:** reduzir barras de ação de Chamados, levar agenda e despacho ao início do fluxo, revisar BM e validação com dados reais.
- **Ciclo 03 — administração e autenticação:** substituir cartões de navegação por listas orientadas à tarefa, alinhar login e formulários ao Design System.
- **Ciclo 04 — portal e mobile:** inventariar e corrigir as 73 páginas de portal por grupos de componentes, validar telefone real, teclado e contraste.
- **Ciclo 05 — regressão global:** capturas em desktop/notebook/tablet/telefone, fluxo crítico ponta a ponta e comparação visual por rota.

## Critério de conclusão deste ciclo

Menu aberto no mobile deve sobrepor temporariamente a página sem deslocar a tarefa, fechar por botão/área externa/Escape, preservar o item ativo e manter os links acessíveis. Mudanças de CSS não podem alterar regras de negócio.

## Execução e evidência do ciclo 01

- O menu demo passou a usar superfície branca, marca colorida legível e ícones SVG do componente existente `OneitNavIcon`.
- Em janela estreita, o menu aberto agora cobre temporariamente a página. O fechamento por botão, pela área externa e por Escape foi conferido no navegador integrado.
- Capturas da inspeção estão em `output/ui-audit/menu-mobile-after.png`, `output/ui-audit/chamados-mobile-after.png` e `output/ui-audit/chamado-detalhe-pendente.png`.
- A barra de Chamados foi reduzida à edição contextual e a um menu de ações secundárias. Botões que apenas exibiam avisos demonstrativos (`Excluir`, `Atualizar`, `Filtros`) saíram da barra; `Novo chamado` permanece no cabeçalho.
- Cada chamado aberto ganhou um botão explícito `Abrir chamado`, verificável por clique único. A ação abriu o painel e o aviso de primeiro atendimento no navegador. O gesto de duplo clique permanece como atalho, mas não é necessário para o fluxo principal.
- A listagem de Chamados em janela estreita passou a mostrar linhas adaptadas com status, assunto, solicitante, técnico, SLA e ação explícita, sem exigir a tabela de 1000 px nem rolagem horizontal. A tabela permanece no desktop. Essa visualização foi inspecionada no navegador integrado com cinco registros demonstrativos.
- ESLint direcionado e `tsc --noEmit` são a validação estática prevista. A inspeção visual cobriu o menu na fila Field; outras larguras e fluxos com dados ainda precisam de verificação.
