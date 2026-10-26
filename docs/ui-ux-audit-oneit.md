# Auditoria UX/UI — OneIT

## Objetivo

Reduzir carga cognitiva e tornar o OneIT previsível: o usuário deve reconhecer onde
está, qual é a ação principal e o que acontecerá ao salvar, sem aprender um padrão
novo em cada módulo.

## Diagnóstico confirmado

| Aspecto | Situação observada | Diretriz adotada |
| --- | --- | --- |
| Navegação | A barra lateral concentra muitos módulos operacionais. | Manter ícones + texto, agrupamento por contexto e um item ativo inequívoco. |
| Cabeçalhos | Alguns módulos usam hero grande; outros usam cabeçalho compacto. | Cabeçalho branco compacto + faixa contextual escura apenas quando ela agregar informação. |
| Listas | Chamados, ativos e catálogo são o centro do uso diário. | Tabelas densas, busca/filtros no topo, hover leve, ordenação e clique para abrir detalhe. |
| Formulários | Campos relacionados às vezes ficam distantes. | Agrupar por objetivo: identificação, vínculo organizacional, classificação, comunicação e encerramento. |
| Ações | Ações secundárias podem competir visualmente com a principal. | Uma ação primária por contexto; demais como botões discretos de borda. |
| Detalhes | Abas são adequadas para chamado, ativo e solicitante. | Máximo de informação relevante por aba, sem repetir campos ou criar cartões decorativos. |
| Estados | SLA, pendência, risco e conclusão precisam ser lidos sem abrir o registro. | Cores semânticas consistentes: verde aberto/saudável, amarelo pendente, vermelho vencido/crítico, cinza encerrado. |
| Animação | Ajuda no reconhecimento de interação, mas pode poluir. | Apenas microinterações de 160–200 ms, com suporte a reduzir movimento. |

## Padrão visual obrigatório

1. Fundo geral cinza muito claro; conteúdo em superfícies brancas com borda sutil.
2. Barra lateral azul petróleo OneIT; texto legível, marca alinhada ao cabeçalho.
3. Espaçamento de 16 px entre controles correlatos e 24–32 px entre seções.
4. Formulários em duas colunas no desktop e uma coluna no celular.
5. Campos obrigatórios identificados por texto, não somente por cor.
6. Tabelas com cabeçalho fixo quando a lista for longa, hover leve e ações por linha
   apenas quando necessárias.
7. Modais somente para decisões curtas; fluxos de cadastro e catálogo devem usar tela
   ampla ou painel consistente.
8. O portal do solicitante permanece separado da navegação técnica.

## Prioridade de melhorias

1. Catálogo de serviços: consolidar como lista contínua por categoria, com busca e
   ordenação previsíveis.
2. Chamados: concentrar classificação e relacionamento sem aumentar a quantidade de
   campos visíveis ao mesmo tempo.
3. Configurações: dividir cadastros mestres por contexto e esconder ações de
   administração de perfis não autorizados quando o RBAC estiver ativo.
4. Mobile técnico: manter somente ações de execução, evidências e check-in/check-out.
5. Relatórios: preservar indicadores resumidos e usar drill-down, evitando dashboards
   com muitos cartões.

## Critério de aceite UX

Uma tela está pronta quando uma pessoa consegue identificar em poucos segundos:
o módulo, o registro que está vendo, o seu status, a próxima ação permitida e onde
encontrar o histórico ou a ajuda, sem rolagem horizontal em largura de desktop.
