# Fechamento administrativo — 01/10/2026

O gestor encerra a OS após conclusão técnica, revisão aprovada e geração do PDF. O procedimento close_ticket trava a OS, valida versão, papel e perfil ativo, exige o PDF mais recente da própria OS e verifica aprovação e objeto no Storage. O técnico que realizou a conclusão não pode encerrar a própria OS, mesmo acumulando papel gerencial.

Como a integração fica para a fase final, o único modo disponibilizado nesta entrega é a exceção INTEGRATION_NOT_ENABLED. São obrigatórios motivo do encerramento, justificativa de ausência de sincronização e reconhecimento explícito. O processo não registra SYNCHRONIZED nem altera sistemas externos. Encerramento comum condicionado ao sucesso da integração será implementado junto com o adapter.

A tabela ticket_closures preserva autor, horário, relatório e justificativas. Histórico de status, encerramento e auditoria são gravados na mesma transação. CLOSED é administrativo; o estado operacional permanece TECHNICALLY_COMPLETED. Novas gerações de relatório ou revisão são bloqueadas pelo estado encerrado. Downloads das versões preservadas continuam sujeitos a RLS.

Homologação pendente no Supabase dev: testar perfil sem acesso, usuário de outra organização, autoencerramento, versão desatualizada, PDF ausente/antigo, aprovação inexistente, exceção não reconhecida e duas solicitações concorrentes. Os testes unitários de entrada não comprovam esses controles de banco.

Esta entrega conclui o fluxo online manual no código. PWA/offline, SLA, painéis, recuperação de objetos órfãos e homologação continuam pendentes no roadmap. Reabertura administrativa não é disponibilizada ainda.
