# Day zero — decisões e controles iniciais

## Decisões confirmadas

1. **Produto:** Servicia FSM é a fonte da verdade para execução de campo; Milldesk e ServiceNow permanecem fontes externas para seus respectivos domínios.
2. **Entrega incremental:** a primeira entrega é a fundação; tickets e PWA entram após a base de autenticação, RBAC e RLS.
3. **Integrações por último:** nenhum endpoint ou contrato de Milldesk/ServiceNow será presumido antes de documentação e homologação oficiais.
4. **Segurança:** toda autorização é validada no servidor e no banco via RLS; a interface não é um mecanismo de segurança.
5. **Dados sensíveis:** GPS, fotos, contatos e evidências terão finalidade definida, retenção aprovada e acesso mínimo necessário antes do piloto.

## Matriz inicial de autorização

| Papel | Administração organizacional | Despacho | Execução de OS | Revisão/fechamento | Auditoria | Dados comerciais |
| --- | --- | --- | --- | --- | --- | --- |
| SUPER_ADMIN | Sim | Sim | Não como técnico | Sim | Sim | Sim, quando autorizado |
| ORG_ADMIN | Sim, na organização | Sim | Não como técnico | Sim | Sim | Conforme política |
| DISPATCHER | Leitura | Sim | Exceção autorizada | Não | Leitura limitada | Não |
| MANAGER | Leitura | Conforme delegação | Não | Sim | Leitura | Conforme política |
| TECHNICIAN | Próprio perfil | Não | Somente OS atribuídas | Não | Não | Não |
| AUDITOR | Não | Não | Não | Não | Leitura | Conforme política |
| FINANCE | Leitura limitada | Não | Não | Não | Leitura limitada | Sim, quando implementado |

## Riscos que exigem decisão antes de produção

- **LGPD:** definir base legal, aviso de privacidade, prazo de retenção e fluxo de atendimento ao titular para evidências, localização e contatos.
- **Autenticação:** definir se MFA será mandatória para todos os perfis administrativos e qual provedor corporativo será usado.
- **Ambientes:** criar projetos Supabase separados para dev, staging e produção; nunca reutilizar secrets entre eles.
- **Bootstrap:** definir quem cria a primeira organização e o primeiro `SUPER_ADMIN`, com trilha auditável.
- **E-mail:** aprovar domínio remetente e a política que impede envios reais em staging.

## Definition of Ready para iniciar Sprint 1

- Repositório remoto e proteção de `main` configurados.
- Proprietário do produto e responsável técnico identificados.
- Projeto Supabase de desenvolvimento criado.
- Um conjunto de usuários de teste autorizado e dados fictícios definidos.
- Matrizes de acesso e política de retenção aprovadas ou explicitamente aceitas como pendência de piloto.
