# Matriz de acesso OneIT

Escopo padrão: toda autorização é verificada no backend e novamente pelas políticas/RPCs do Supabase com `organization_id`.

| Perfil | Operação/chamados | Despacho/OS | Financeiro/BM/RTO | Administração | Auditoria |
|---|---|---|---|---|---|
| SUPER_ADMIN | visualizar, criar, editar, excluir | completo | completo | completo | completo |
| ORG_ADMIN | visualizar, criar, editar, excluir | completo | completo | completo | completo |
| MANAGER | visualizar e operar fila | criar/editar despacho, revisar OS | visualizar e aprovar conforme fluxo | configurações operacionais | consultar auditoria |
| DISPATCHER | visualizar fila | despachar, agendar e comunicar | sem acesso financeiro | sem configuração administrativa | sem auditoria administrativa |
| TECHNICIAN | acessar OS atribuída | executar etapas e evidências | sem acesso | sem acesso | sem acesso |
| FINANCE | consulta operacional necessária | sem despacho | medições, lotes, PDFs, e-mails e conciliação | sem administração de usuários | consultar eventos financeiros |
| AUDITOR | somente leitura autorizada | somente leitura | somente leitura | somente leitura de trilhas | auditoria completa no escopo |

Regras verificadas:

- Usuário só pode administrar acessos se tiver `SUPER_ADMIN` ou `ORG_ADMIN` na organização alvo.
- RPCs de acesso recusam usuários que não sejam membros da organização alvo.
- Consultas administrativas filtram organização e usuário alvo.
- Rotas financeiras validam papel e `organization_id` do registro antes de ler ou alterar.
- RLS limita leitura e escrita ao tenant autorizado.
- Menus ocultos não são considerados controle de segurança.

Limitação de evidência: não foi possível executar um E2E bilateral com duas credenciais reais nesta sessão; a validação cruzada permanece pendente operacionalmente, embora os contratos de autorização e RLS estejam cobertos por testes e código revisado.
