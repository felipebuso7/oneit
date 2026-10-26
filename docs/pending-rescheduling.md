# Pendências e reagendamento — 01/10/2026

Motivos iniciais: cliente, acesso, material, terceiro, TI do cliente e autorização. Cada motivo só é oferecido em etapas compatíveis. O técnico atribuído ou a gestão pode iniciar uma pendência, com justificativa. A gestão resolve e retoma exatamente o estado anterior; o estado de retomada não é enviado pelo frontend.

A tabela ticket_pending_periods preserva etapa de origem, autor e horário da abertura, responsável e justificativa da resolução. Existe no máximo uma pendência aberta por OS. Histórico de status e auditoria acompanham a alteração na mesma transação, com controle de versão e lock. Pendência não pausa SLA automaticamente: isso dependerá da política contratual no módulo de SLA.

Reagendamento é permitido à gestão antes do início do serviço, em SCHEDULED, ASSIGNED, TRAVEL_STARTED e ON_SITE. A agenda anterior recebe RESCHEDULED e um novo registro é criado, com motivo e vínculo entre as agendas. As constraints de sobreposição e agenda ativa impedem conflitos; se a nova agenda falhar, a anterior permanece ativa por rollback. A OS volta a SCHEDULED e a atribuição deve ser reconfirmada. Check-ins anteriores não são apagados.

Pendências precisam ser resolvidas antes de reagendar. Reagendamento após início do serviço e múltiplas visitas exigem um domínio de visitas, ainda pendente. Horários do novo reagendamento exigem ISO 8601 com offset explícito, evitando interpretação pelo fuso do servidor; o formulário inicial de agenda ainda precisa receber a mesma melhoria de UX/fuso.

Migration: 20261001160000_pending_rescheduling.sql. Homologação no Supabase dev continua pendente para autorização, conflitos, rollback, concorrência e isolamento entre organizações. Os testes unitários cobrem regras de entrada e opções por etapa.

Validação local deste incremento: typecheck, lint e build concluídos; 30 testes unitários passaram. O Vitest ainda emite aviso de processo aberto ao encerrar, embora retorne código zero. Isso não valida migrations, RLS nem transações no banco.
