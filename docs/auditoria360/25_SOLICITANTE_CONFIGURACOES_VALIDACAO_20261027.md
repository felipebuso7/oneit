# Solicitante, parâmetros e validação da OS — 27/10/2026

## Fatos confirmados no código

- O formulário autenticado de colaboradores enviava `unitType`, `departmentId`, `costCenterId` e `effectiveFrom`, mas as ações esperavam `type`, `departmentUnitId`, `costCenterUnitId` e `startsOn`. Cadastro de unidade e vínculo organizacional falhavam na validação antes de chegar ao banco.
- A tela autenticada de abertura consulta colaboradores ativos da organização; sem um colaborador cadastrado, a lista de solicitantes fica vazia. Ela não consulta os solicitantes da demonstração, que são guardados apenas no navegador.
- Na demonstração, a criação pelo catálogo escolhia automaticamente o primeiro solicitante cadastrado. Agora exige escolha explícita.
- O checkout do técnico parceiro muda a `service_order` para `COMPLETED`; o gatilho cria entrada em `field_service_review_queue`. A ação `review_field_service_order` aprova a OS como `VALIDATED`, mas não atualiza o status administrativo do chamado. O PDF do RTO é gerado por outra ação posterior. O fechamento administrativo de chamado existente exige `ticket_reports` e `ticket_completions`, incompatíveis com o fluxo parceiro baseado em `field_service_rto_reports`.

## Correções locais deste ciclo

- Corrigidos os nomes dos campos do formulário autenticado e exposto o e-mail principal.
- A abertura autenticada avisa quando não existem solicitantes ativos e oferece acesso ao cadastro.
- Na demonstração, a seleção do solicitante passou a ocorrer antes da criação; a fila de validação permite registrar o parecer e concluir a OS/chamado no armazenamento local, após conferir LPU, assinatura e evidência.
- Regiões e unidades de medida foram retiradas do menu principal da demonstração e agrupadas em abas de Configurações; a tela de regiões foi simplificada.
- Na revisão autenticada, as ações “Validar OS” e “Devolver para correção” ficaram explícitas e a aprovação é bloqueada quando a submissão técnica não é encontrada.

## Pendente estrutural para o fluxo autenticado

Definir e implementar, com migração aditiva e testes de integração, o fechamento administrativo de chamados originados em Field Service. A transação deve exigir OS validada, RTO PDF persistido, versão corrente do chamado, papel gerencial e trilha de auditoria; deve preservar o fechamento ITSM existente e impedir dupla conclusão. A UI deve mostrar o próximo passo após validar a OS e gerar o RTO. Não aplicar a migração no banco compartilhado antes da revisão do contrato e de um ensaio de rollback.

## Validação deste ciclo

- `npm run typecheck`: passou.
- ESLint direcionado aos arquivos alterados: passou.
- Vitest direcionado: 4 arquivos, 6 testes passaram. O processo de teste demorou a sair após o resultado; terminou sem falha de teste.
- Navegação visual e operação real no Supabase/Vercel: **não validadas** neste ciclo. O ambiente local recusou acesso HTTP à porta de desenvolvimento dentro do sandbox.
