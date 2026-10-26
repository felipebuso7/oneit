# Portal persistente de Field Service — ciclo 26/10/2026

## Diagnóstico confirmado

- `/demo` usa armazenamento do navegador e não compartilha chamados entre gestor e técnico.
- `/portal` já possui autenticação Supabase, tabelas de chamados/OS, RPC de despacho atômico, execução técnica e revisão. A navegação, porém, separava o despacho em telas de OS e agenda.
- A conclusão técnica do portal exigia uma justificativa ao declarar que não houve consumo de material, mesmo quando o atendimento era apenas de mão de obra. Essa regra contrariava o processo definido: o técnico registra o que fez; o gestor seleciona a composição faturável da LPU.
- O projeto Supabase `oneit-staging` não possui usuários no Auth. O fluxo autenticado ainda não foi homologado com perfis reais.

## Correções desta etapa

1. Criada `/portal/field-service`: fila, indicadores essenciais, seleção de chamado, técnico e polo, agenda conhecida e despacho em um painel. O comando usa `/api/field-service/dispatch`, que chama `dispatch_ticket_to_field` para gravar OS, rota, parada, chamado e auditoria numa transação. A RPC mantém a decisão final sobre permissão e conflito de horário.
2. A navegação autenticada aponta para Central Field Service, Validação de OS e Minha agenda. O grupo SGSTI foi retirado do menu operacional, sem excluir suas rotas ou dados.
3. A declaração de material continua obrigatória, mas a ausência de consumo não exige justificativa. A migration `20261026110000` remove a constraint anterior e atualiza a RPC `complete_ticket`; o texto do formulário e sua validação foram alinhados.
4. Links de recuperação em Preview usam `VERCEL_URL` do deployment atual, evitando o endereço de uma prévia anterior.

## Validação e limites

- `npm run typecheck`, lint dos arquivos alterados, auditoria estrita de migrations e teste dirigido de conclusão sem material passaram localmente. A migration foi aplicada em `oneit-staging` após dry-run de uma única migration.
- O teste funcional completo no navegador continua pendente: não há usuário de Auth cadastrado, nem organização operacional criada nesse projeto. Compilar e abrir login não provam o ciclo real.
- A tela mostra agenda conhecida; não informa localização em tempo real, distância de rota ou tempo estimado sem fonte geográfica real.
- O fluxo `/demo` permanece separado e deve ficar restrito à demonstração. O portal persistente ainda precisa de onboarding seguro, testes ponta a ponta, geração de RTO/BM com dados de teste, backup/restore e hospedagem apta para uso comercial antes da promoção.

## Bloqueio de fluxo identificado após a prévia

- `review_field_service_order` valida a OS e a fila de Field Service, mas não aprova o chamado correspondente. `review_ticket` aprova o chamado por outra operação. Um atendimento que produza ambos os registros pode exigir duas decisões gerenciais. A unificação precisa preservar as regras de segregação de funções, versionamento, devolução e o histórico; não foi tratada como uma mudança apenas visual.
- A tela de revisão escondia falhas ao carregar a fila de Field Service, apresentando-a como vazia. Ela agora falha explicitamente. Também exibe corretamente atendimentos sem consumo de material e sem justificativa opcional.
- A prévia Vercel com `ONEIT_PREVIEW_MODE=portal` redireciona o acesso direto ao portal para login e não disponibiliza `/demo`; isso valida o bloqueio da demo, não a conclusão do fluxo autenticado.
- O CI de migrations passou; a verificação geral do PR ainda estava pendente na última consulta. A criação de usuários, os URLs permitidos do Supabase Auth e o ensaio completo com dados fictícios continuam pendentes.
