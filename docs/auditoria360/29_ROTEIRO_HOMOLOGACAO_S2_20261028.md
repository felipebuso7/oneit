# Roteiro de homologação — Sprint S2 Field Service

## Objetivo

Comprovar, em homologação autenticada e usando apenas dados fictícios, que o chamado percorre o ciclo operacional canônico sem duplicar OS, fila de validação, RTO ou fechamento.

## Pré-condições

- Usuário gestor com papel `MANAGER`, `ORG_ADMIN` ou `SUPER_ADMIN`.
- Organização de teste, empresa/local, solicitante, serviço, LPU vigente e técnico ativo.
- Conta de técnico parceiro ou técnico interno de teste.
- Storage de evidências e relatórios configurado.
- Nenhum destinatário real de WhatsApp/e-mail.

## Cenário principal

| Etapa | Ação | Evidência mínima | Resultado esperado |
|---|---|---|---|
| 1 | Abrir chamado no portal | HTTP da Server Action, `ticket.id` e registro em `tickets` | Chamado criado em `NEW`/`TRIAGE`, com solicitante e organização corretos. |
| 2 | Classificar e encaminhar para visita | resposta de despacho, `service_order.id` | Uma OS vinculada ao chamado, técnico elegível e horário registrado. |
| 3 | Preparar WhatsApp | URL e mensagem exibidas | Número normalizado; abertura da conversa não é registrada como entrega. |
| 4 | Iniciar deslocamento | evento/status e timestamp | OS em deslocamento; ação anterior não fica disponível novamente. |
| 5 | Fazer check-in | timestamp e, se autorizado, localização | OS no local/atendimento, sem substituir o histórico anterior. |
| 6 | Preencher execução | relato, fotos, assinatura e materiais aplicáveis | Submissão persistida; campos assinados ficam protegidos conforme regra. |
| 7 | Finalizar tecnicamente | checkout, status persistido | OS em `COMPLETED` e entrada única em `field_service_review_queue` com `PENDING`. |
| 8 | Abrir validação | URL `/portal/review` e queries | Gestor vê relato, evidências, assinatura, materiais e LPU. |
| 9 | Aplicar LPU e aprovar | linha em `field_service_order_lpu_lines`, decisão e auditoria | Fila muda para `APPROVED`; não altera silenciosamente o histórico. |
| 10 | Gerar RTO | registro em `field_service_rto_reports` e objeto no Storage | PDF acessível por download autorizado e vinculado à OS. |
| 11 | Encerrar chamado | retorno da função/ação de fechamento | Chamado fica `CLOSED` somente com OS aprovada, RTO e parecer gerencial. |

## Cenários de exceção obrigatórios

1. Dois gestores tentam aprovar a mesma OS: somente uma transição deve vencer; a segunda recebe conflito sem duplicar RTO.
2. Aprovação sem submissão: botão deve permanecer bloqueado ou a API deve rejeitar.
3. Encerramento sem RTO: API deve rejeitar e manter o chamado aberto.
4. Devolução para correção: exige justificativa e preserva a revisão anterior.
5. Reenvio da mesma submissão: não cria nova OS nem duas entradas pendentes sem revisão rastreável.
6. Usuário de outra organização tenta ler ou alterar os IDs: RLS/API devem negar o acesso.
7. Falha de Storage na geração do RTO: não permitir o fechamento administrativo.

## Registro da execução

Para cada etapa registrar:

- data/hora e ambiente;
- usuário e organização;
- rota/ação executada;
- status HTTP e request id;
- IDs de chamado, OS, fila, submissão e RTO;
- estado antes/depois;
- captura de tela somente quando não expuser dados reais;
- erro completo, sem credenciais, se houver.

## Critério de aprovação

O cenário só é aprovado quando todas as etapas principais e exceções têm evidência persistida e reproduzível. A abertura do WhatsApp ou a geração local de um PDF não comprovam entrega externa nem prontidão de produção.

## Limitação conhecida

No ambiente Windows atual, o Vitest pode falhar antes da coleta por `EPERM` em arquivos temporários do Vite. Esse bloqueio deve ser repetido em Linux/CI antes de transformar o roteiro em evidência automatizada aprovada.
