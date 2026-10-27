# Fechamento Field Service em homologação — 27/10/2026

## Fatos verificados

- Projeto de destino: Supabase `oneit-staging` (`bkhcnqkhiablstdqdyic`), plano Free, região Ohio, sem backup gerenciado. Nenhum dado do OneFlow foi alterado.
- A migração `20261027170000_field_service_ticket_closure.sql` foi ensaiada no SQL Editor com `BEGIN` e `ROLLBACK`; após o ensaio, consulta de catálogo confirmou tabela e função ausentes e zero gatilhos. A primeira tentativa de aplicação anexou o script ao texto anterior do editor e falhou com `relation already exists`; a consulta posterior confirmou novamente ausência dos objetos. Depois, o editor foi limpo e o script único retornou `Success`.
- Consulta após aplicação confirmou `field_service_ticket_closures`, `close_field_service_ticket(uuid,integer,uuid,text,text,boolean)`, dois gatilhos e RLS habilitado. O histórico formal de migrations do Supabase não foi atualizado pelo SQL Editor. O arquivo no Git é idempotente para aplicação futura pelo pipeline; essa reconciliação ainda precisa ser executada e validada.
- A função exige gestor ativo, versão corrente do chamado, OS validada e com checkout, revisão aprovada, PDF RTO registrado no Storage, parecer e reconhecimento da ausência de sincronização com o sistema externo. Grava fechamento, estados e auditoria em uma transação.
- A UI de revisão apresenta fechamento após o RTO; a página de fechamento mostra o RTO vinculado ao chamado encerrado.

## Limites e bloqueios para produção

- Não houve teste ponta a ponta com checkout, aprovação, geração do PDF e encerramento no Supabase. Não chamar o fluxo de validado até executar esse cenário e os casos de conflito/permissão.
- O projeto Vercel `okaa1/oneit` não está conectado ao Git. A prévia Ready observada antes desta alteração aponta ao commit `36f11d9`, e não ao código desta migração.
- O banco Free não oferece backup gerenciado neste projeto. Não usar dados reais antes de definir backup independente, restauração testada e plano comercial de hospedagem.
- O chamado externo (Milldesk/ServiceNow) não é fechado automaticamente; a UI e a função registram essa exceção explicitamente.
- O build local no sandbox Windows falhou por `EPERM` ao criar pastas em `.next` e em uma saída isolada; isso não demonstra falha de compilação do código. É necessário build Linux ou execução sem o bloqueio local.
