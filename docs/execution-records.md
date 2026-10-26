# Diagnóstico e checklist — incremento de 01/10/2026

O técnico atribuído e ativo pode registrar diagnóstico, serviço realizado/encaminhamento e checklist quando a OS estiver em WORK_STARTED ou IN_PROGRESS. A função save_ticket_execution verifica versão, autorização e estado sob lock da OS e grava o registro, status e auditoria na mesma transação.

Os registros são append-only para usuários autenticados. A primeira gravação copia os itens do template para a OS; alterações posteriores do template não modificam a execução já iniciada. Há um checklist geral inicial, com possibilidade de substituição por template da organização no banco. O cadastro de templates por tipo de serviço e contrato ainda precisa ser implementado.

Checklists incompletos podem ser salvos como registro de trabalho em andamento. Eles não representam conclusão técnica. CABLING avança para IN_PROGRESS; os demais domínios encaminham a OS para OUT_OF_SCOPE e preservam diagnóstico e justificativa de encaminhamento.

O formulário reapresenta o último registro salvo. As operações dependem da aplicação da migration 20261001110000_execution_records.sql no Supabase de desenvolvimento. A execução real da função e das políticas RLS ainda não foi verificada neste ambiente.

Pendências: evidências privadas, materiais, conclusão técnica com validação de completude, interface de configuração de templates e recuperação de rascunhos locais/offline.
