# Auditoria global de UI/UX e Design System — 25/10/2026

## Escopo e limite da evidência

Esta primeira etapa foi uma inspeção estática do App Shell, `PortalSidebar`, tokens em
`src/app/globals.css`, árvore de rotas administrativas e componentes Field Service. Não foi
feita captura nova de todas as rotas porque o build de produção Windows falha com `EPERM` e
não há ambiente autenticado de homologação disponível. As conclusões abaixo distinguem fatos
do código de hipóteses visuais que ainda exigem renderização.

## Fatos confirmados

1. O `PortalSidebar` é um componente único, mas usa símbolos Unicode (`▣`, `◉`, `◷`, `!`)
   derivados por texto, em vez de uma biblioteca/tabela de ícones estável.
2. O menu possui muitos links planos dentro de quatro grupos; SGSTI concentra grande quantidade
   de itens sem segundo nível recolhível.
3. O estado recolhido troca a marca por um círculo com a letra `O`, reduzindo reconhecimento da
   marca e não oferecendo um sistema de tooltips persistente.
4. O conteúdo usa `ml-64` fixo no layout, enquanto o CSS também controla `--oneit-portal-sidebar-width`.
   Há dois mecanismos de deslocamento que podem divergir.
5. O Design System atual é principalmente CSS global (`oneit-page-header`, `oneit-card`,
   `oneit-btn`), sem componentes React centrais equivalentes para tabela, formulário, diálogo,
   badge, estados vazio/carregando/erro e filtros.
6. A tipografia base é `Arial, Helvetica, sans-serif`; não existe escala semântica tipográfica
   formalizada.
7. O CSS contém compatibilidade para várias cores utilitárias arbitrárias, sinal de migração
   visual incompleta.
8. O Field Service possui estilos próprios e requisitos de mapa/agenda que não devem ser
   forçados ao mesmo layout de tabelas administrativas.

## Inferências de risco

- A combinação de menu plano, ícones derivados por texto e dois mecanismos de offset tende a
  produzir inconsistências de alinhamento, colunas escondidas e comportamento frágil no estado
  minimizado.
- A ausência de componentes centrais aumenta a probabilidade de cada tela implementar seus
  próprios botões, cabeçalhos, tabelas e mensagens.
- O grande volume de rotas demo/legadas dificulta uma migração visual global sem inventário e
  sem separar telas realmente expostas das telas de demonstração.

## Auditoria visual proposta

### Etapa A — Fundação

- Consolidar tokens semânticos de cor, espaçamento 4px, tipografia, elevação, raio e breakpoints.
- Criar contratos para `PageHeader`, `Toolbar`, `DataTable`, `StatusBadge`, `EmptyState`,
  `LoadingState`, `ErrorState`, `Drawer` e `ConfirmDialog`.
- Definir regras de densidade para administração, operação e mobile.

### Etapa B — App Shell e navegação

- Substituir símbolos Unicode por ícones consistentes.
- Tornar grupos de navegação recolhíveis, preservando o item ativo.
- Manter marca reconhecível no estado minimizado e fornecer tooltip acessível.
- Remover o `ml-64` fixo e usar uma única variável de layout.
- Validar foco, teclado, contraste e não sobreposição.

### Etapa C — Tela piloto

Priorizar a Central de Field Service: cabeçalho, fila, painel de despacho, agenda e mapa.
Validar desktop amplo, notebook, tablet e smartphone antes de propagar padrões.

### Etapa D — Administração e operação

Migrar progressivamente chamados, técnicos, empresas/polos, LPU, BM/fiscal e configurações
para os componentes centrais, sem alterar regras de negócio.

### Etapa E — QA visual

- Capturas antes/depois por rota.
- Testes de viewport e teclado.
- Estados vazio, carregando, erro e sucesso.
- Regressão funcional com a suíte existente.

## Backlog inicial

| Prioridade | Item | Evidência | Critério de aceite |
|---|---|---|---|
| P1 | Unificar offset da sidebar | `ml-64` no layout + variável CSS | conteúdo nunca fica sob o menu em nenhum estado |
| P1 | Navegação hierárquica | grupos planos, SGSTI extenso | grupos recolhíveis, item ativo preservado |
| P1 | Ícones estáveis | símbolos Unicode por label | ícones consistentes e acessíveis |
| P1 | Central Field Service piloto | requisito operacional de mapa/agenda | despacho compreensível em poucos passos |
| P2 | Componentes React centrais | padrões hoje majoritariamente CSS | páginas novas usam componentes reutilizáveis |
| P2 | Tipografia e tokens | Arial e valores arbitrários | escala documentada e aplicada |
| P2 | Auditoria responsiva | não executada em todas as rotas | evidência por viewport e teclado |
| P3 | Limpeza de legado demo | lint global com alto débito | redução por domínio sem autofix global |

## Decisão antes da implementação

A primeira implementação recomendada é a Etapa B (App Shell), precedida por uma tela piloto
Field Service. Não é recomendável alterar todas as telas simultaneamente: o risco de regressão
visual e operacional é alto, especialmente porque o build Linux e a autenticação real ainda não
foram homologados.

## Ciclo 1 executado

- Removido o `ml-64` fixo do conteúdo do portal.
- O deslocamento passa a depender exclusivamente de `data-oneit-portal-sidebar-offset` e da
  variável de largura da sidebar.
- TypeScript aprovado.
- ESLint do layout e da sidebar aprovado.
- Testes de navegação/sidebar e paleta: **9/9 aprovados**.
- O fundo da sidebar do portal e do solicitante passou de gradiente para superfície sólida
  petrol, e o estado ativo passou a usar contraste petrol/ciano sem usar laranja como elemento
  decorativo. TypeScript, ESLint e **4/4 testes** de sidebar passaram.
- Criado `OneitNavIcon`, conjunto SVG interno sem nova dependência, e o `PortalSidebar` deixou
  de renderizar símbolos Unicode derivados por texto. TypeScript, ESLint e **4/4 testes** de
  sidebar passaram.
- O portal passou a usar grupos recolhíveis no modo expandido, com estado persistido em
  `localStorage`; no modo minimizado, os links continuam acessíveis por ícone e tooltip. Após
  remover uma atualização de estado incompatível com a regra React Hooks, TypeScript e ESLint
  passaram e o teste de sidebar ficou **4/4 aprovado**.
- O grupo correspondente à rota atual agora permanece aberto automaticamente, mesmo quando o
  usuário havia recolhido esse grupo anteriormente. TypeScript, ESLint e **4/4 testes** de
  sidebar passaram.
- Foram adicionados tokens semânticos globais para espaçamento em escala de 4px, raios,
  tipografia e sombras. A alteração é fundacional e não muda regras de negócio; TypeScript
  permaneceu aprovado.
- Criado o componente reutilizável `OneitPageHeader`, com título, descrição, eyebrow,
  breadcrumb e ações. ESLint e TypeScript aprovados; a adoção nas rotas será gradual para
  evitar regressão visual.
- Aplicado o `OneitPageHeader` na tela de agenda do técnico Field Service como tela piloto,
  preservando todos os formulários e ações operacionais. ESLint e TypeScript aprovados.
- Criado `OneitKpiGrid` para padronizar indicadores com tons semânticos e hints opcionais.
  O componente está isolado e validado; a integração no Dashboard será feita após a decomposição
  da página monolítica.
- Criado `OneitSection` para padronizar títulos de seção, descrições, ações e conteúdo interno.
  ESLint e TypeScript aprovados; a migração das telas será gradual.
- Criados estados reutilizáveis `OneitEmptyState`, `OneitLoadingState` e `OneitErrorState`,
  com semântica de acessibilidade e aparência consistente. ESLint e TypeScript aprovados.
- Criado `OneitFilterBar` para organizar busca, filtros e ações contextuais em uma única linha
  responsiva. ESLint e TypeScript aprovados.
- Criado `OneitStatusBadge` com tons semânticos neutro, informação, sucesso, atenção e risco,
  evitando que cada tela defina suas próprias cores de estado. ESLint e TypeScript aprovados.
- Aplicado o `OneitStatusBadge` na agenda do técnico Field Service, preservando os valores reais
  de `operational_status`. ESLint e TypeScript aprovados.
- Criado `OneitDataTable` com cabeçalho semântico, caption acessível, rolagem horizontal
  controlada e densidade corporativa. ESLint e TypeScript aprovados; a migração de tabelas
  existentes permanece gradual.
- Adicionado acabamento global para tabelas OneIT: hover discreto, foco por teclado e
  alinhamento vertical consistente. TypeScript aprovado.
- Criado `OneitButton` com variantes primary, secondary, action e danger, além de estado
  `loading` acessível. ESLint e TypeScript aprovados; a substituição de botões existentes será
  gradual e orientada por tela.
- Criado `OneitConfirmation` com diálogo modal semântico, foco estrutural, ações de confirmar/
  cancelar e suporte a conteúdo adicional. ESLint e TypeScript aprovados.
- Criado o barrel `src/components/oneit/index.ts`, centralizando os componentes do Design System
  para adoção gradual. TypeScript aprovado.
- Migrada a tela administrativa de Clientes como segundo piloto: `OneitPageHeader`,
  `OneitButton` e `OneitEmptyState` aplicados, mantendo a action de cadastro e a consulta
  existentes. ESLint e TypeScript aprovados.
- Migrada a tela de Organizações com o mesmo padrão, incluindo estado vazio e botão reutilizável,
  preservando a action de atualização. ESLint e TypeScript aprovados.
- Migrada a tela de Técnicos, com cabeçalho contextual, botão, estado vazio e badge semântico
  de status. Cadastro, regiões e vínculo do técnico foram preservados. ESLint e TypeScript
  aprovados.
- A tela de LPU deixou de existir apenas no fluxo demonstrativo: foi criada a rota autenticada
  `/portal/settings/field-service/lpu`, acessível em Configurações > Atendimento > LPU e materiais.
  Ela consulta os itens persistidos da organização, permite cadastrar, editar e desativar itens e
  reutiliza a API existente, as unidades padronizadas e os componentes do Design System. TypeScript
  e ESLint passaram nos arquivos alterados.
- Limitação ainda não homologada neste ambiente: a autorização entre organizações nessa API depende
  da configuração efetiva de RLS/políticas do Supabase. A tela restringe a seleção às organizações
  retornadas ao usuário, mas a validação de isolamento precisa ser executada com usuários de escopos
  distintos antes de produção.
- Ajustada a tela autenticada `portal/field`: a largura útil passou de `max-w-xl` para `max-w-5xl`,
  reduzindo compressão e rolagem desnecessária em desktop; o estado vazio passou a usar o padrão
  `OneitEmptyState`; e os estados operacionais receberam rótulos em português sem alterar os valores
  persistidos ou as transições. TypeScript e ESLint passaram.
- A página geral de Configurações foi migrada para `OneitPageHeader` e `OneitSection`, eliminando
  cabeçalho e cartões locais com espaçamentos próprios. As rotas, links e verificação de perfil foram
  preservados. TypeScript e ESLint passaram.
- O Dashboard operacional foi migrado para `OneitPageHeader`, `OneitKpiGrid`, `OneitSection` e
  `OneitEmptyState`. O filtro de período, métricas, barras, backlog e ações de pausa/retomada de SLA
  foram preservados; a barra de prioridade deixou de usar laranja decorativo e passou a usar tom neutro
  semântico. TypeScript e ESLint passaram.
- A entrada `/portal` deixou de ser uma tela institucional isolada e passou a oferecer uma entrada
  objetiva para Dashboard e fila de chamados, usando `OneitPageHeader` e `OneitSection`. Nenhuma rota,
  consulta ou permissão foi alterada. TypeScript e ESLint passaram.
- O estado minimizado da sidebar deixou de exibir a letra genérica `O`; agora usa o símbolo real da
  marca OneIT em uma janela compacta, preservando o link de início, tooltip, ícone de expansão e a
  largura do conteúdo. TypeScript e ESLint do componente passaram.
- O botão de logout da sidebar deixou de usar o caractere Unicode `↪` e passou a usar o mesmo sistema
  SVG de ícones da navegação, com nome acessível preservado. A action de logout não foi alterada.
  TypeScript e ESLint passaram.
- A tela de login recebeu hierarquia semântica explícita, foco visível nos campos e botão com área de
  toque mínima de 44px, sem alterar autenticação, recuperação de senha ou mensagens de erro. TypeScript
  e ESLint passaram.
- As telas de recuperação e redefinição de senha receberam o mesmo padrão de foco, área de toque e
  associação semântica de formulário. As actions de recuperação, proteção contra enumeração e política
  de senha mínima de 12 caracteres foram preservadas. TypeScript e ESLint passaram.
- Os controles de expandir/recolher da sidebar deixaram de usar caracteres Unicode e passaram a usar o
  ícone SVG padrão com rotação direcional. Labels, tooltip, estado persistido e comportamento foram
  preservados. TypeScript e ESLint passaram.
- A fila autenticada de revisão gerencial recebeu cabeçalho padronizado, largura útil maior e estado
  vazio semântico. As filas de OS, aprovação, devolução, evidências, LPU e geração de RTO permanecem
  inalteradas. TypeScript e ESLint passaram.
- A fila autenticada de Chamados passou a usar `OneitPageHeader` e feedback de mensagem com superfície
  semântica consistente. Formulário de abertura, consultas de catálogo, SLA, tabela e limite de 500
  registros foram preservados. TypeScript e ESLint passaram.
- A tabela de Chamados passou a usar `OneitStatusBadge` e as classes de tabela do Design System,
  substituindo cores locais de situação e bordas arbitrárias. Ordenação, links, ações de triagem/
  agendamento e estado vazio foram preservados. TypeScript e ESLint passaram.
- A fila autenticada de Ordens de Serviço passou a usar `OneitPageHeader`, `OneitSection`,
  `OneitStatusBadge` e `OneitEmptyState`. Criação, despacho, agenda, técnicos, limites de consulta e
  mensagens foram preservados; os status agora têm semântica visual consistente. TypeScript e ESLint
  passaram.
- O detalhe autenticado do chamado passou a usar `OneitPageHeader` para separar claramente navegação,
  identificação do chamado e metadados operacionais. Histórico, triagem, comunicações, ativos, SLA,
  despacho e demais actions foram preservados. TypeScript e ESLint passaram.
- No detalhe do chamado, os estados operacional e administrativo passaram a usar `OneitStatusBadge`,
  destacando conclusão, cancelamento e andamento sem alterar os códigos persistidos. TypeScript e ESLint
  passaram.
- Os cabeçalhos ordenáveis da tabela de Chamados agora têm `type="button"` e `aria-label` contextual,
  comunicando direção crescente/decrescente sem risco de submit acidental. TypeScript e ESLint passaram.
- A fila de Ordens de Serviço passou a apresentar rótulos operacionais em português para os status,
  mantendo os códigos técnicos apenas no backend e sem alterar as transições. TypeScript e ESLint
  passaram.
- O botão de criação de OS foi migrado para `OneitButton`, mantendo a action de criação e os campos do
  formulário. TypeScript e ESLint passaram.
- A tela de RTOs gerados passou a usar `OneitPageHeader`, `OneitSection` e `OneitEmptyState`; o download
  continua apontando para a API autenticada do relatório, com versão e hash preservados. TypeScript e
  ESLint passaram.
- A tela de Relatórios de atendimento passou a usar `OneitPageHeader` e `OneitEmptyState`, ampliando a
  área útil e clarificando o estado sem OS aprovada. Geração de versões, consulta e download de PDF foram
  preservados. TypeScript e ESLint passaram.
- A tela de Agenda e atribuição passou a usar `OneitPageHeader`, `OneitSection`, `OneitButton`,
  `OneitStatusBadge` e `OneitEmptyState`. Agendamento, atribuição, técnicos, horários UTC e mensagens
  foram preservados. TypeScript e ESLint passaram.
- A tela de Rotas passou a usar `OneitPageHeader`, `OneitSection`, `OneitButton`, `OneitStatusBadge` e
  `OneitEmptyState`. Criação da rota, inclusão/reordenação de paradas, técnicos, limites e mensagens
  foram preservados. TypeScript e ESLint passaram.
- Os status técnicos das rotas agora aparecem com rótulos operacionais em português no badge, mantendo
  os códigos persistidos e as transições intactos. TypeScript e ESLint passaram.
- Os controles de subir/descer paradas na tela de Rotas deixaram de usar setas Unicode e passaram a
  usar o ícone SVG padrão, com `type="submit"` explícito e labels acessíveis preservados. TypeScript e
  ESLint passaram.

### Ciclo 9 — diagnóstico de execução local

- `next.config.ts` já desabilita explicitamente `experimental.webpackBuildWorker` e limita `cpus`/compilações paralelas; portanto o erro observado não é causado por uma configuração ausente desse recurso.
- O processo de desenvolvimento deixou um lock em `.next/dev/lock` associado a um PID que já não estava disponível. Em execução isolada com `ONEIT_NEXT_DIST_DIR=.next-dev-3010` e Turbopack, o Next iniciou e reportou `Ready`; contudo, o acesso HTTP a loopback continua bloqueado pelo ambiente de execução, então não foi possível comprovar a renderização pelo navegador nesta sessão.
- A recomendação operacional é iniciar cada instância com um `ONEIT_NEXT_DIST_DIR` exclusivo quando houver outra sessão local ativa e encerrar o processo anterior antes de reutilizar a porta. Isso é uma mitigação de ambiente, não uma alteração funcional do produto.
- Foi criado o comando `npm run dev:isolated`, que aplica automaticamente `ONEIT_NEXT_DIST_DIR=.next-dev-isolated`; a opção aceita argumentos normais do Next, por exemplo `npm run dev:isolated -- --turbopack --port 3010`.
