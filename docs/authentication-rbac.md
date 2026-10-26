# Autenticação e perfis

## Implementado

- Login administrativo em `/login`.
- Logout, recuperação e redefinição de senha.
- Sessão server-side com Supabase Auth.
- Callback de confirmação de sessão.
- Portal protegido por `requireUser`.
- Suporte preparado para sessão OIDC self-hosted no modo VPS.
- Portal de campo restrito ao papel `TECHNICIAN`.
- Cadastro administrativo de técnicos protegido por organização e papel administrativo.

## Matriz de capacidades

| Papel | Administração | Despacho Field | Execução Field | Faturamento | Auditoria |
| --- | --- | --- | --- | --- | --- |
| SUPER_ADMIN | Sim | Sim | Não como técnico | Sim | Sim |
| ORG_ADMIN | Sim | Sim | Não como técnico | Sim | Sim |
| MANAGER | Não global | Sim | Não como técnico | Não | Sim |
| DISPATCHER | Não | Sim | Não como técnico | Não | Não |
| TECHNICIAN | Não | Não | Sim | Não | Não |
| FINANCE | Não | Não | Não | Sim | Não |
| AUDITOR | Não | Não | Não | Não | Sim |

O tipo de técnico `PARTNER` é uma classificação operacional do cadastro, não um papel administrativo. O acesso externo do parceiro deve continuar sendo feito pelo link/código da OS, sem sessão no portal de gestão.

## Homologação obrigatória

Antes da produção, testar com contas reais em ambiente isolado:

1. login, logout, expiração e recuperação de senha;
2. segregação entre organizações;
3. técnico sem acesso a administração, faturamento e precificação;
4. financeiro sem acesso à execução de campo;
5. gestor com despacho e validação, sem administração global;
6. auditor com leitura de trilhas, sem alteração operacional;
7. link externo do técnico sem autenticação administrativa;
8. RLS aplicada no banco e comportamento após revogação de papel.

Os testes locais validam contratos de código, mas não substituem essa homologação no provedor de identidade e no banco reais.
