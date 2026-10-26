# Domínio de tickets — fundação

## Implementado

- Ticket com UUID interno, número humano, referências externas preservadas e controle de versão.
- Status operacional e administrativo separados.
- Histórico append-only criado por trigger para inserções e mudanças de status.
- RLS: gestão lê e altera tickets da própria organização; técnico lê somente tickets a ele atribuídos.
- Máquina de estados TypeScript testada para o fluxo operacional.

## Próximo incremento

As transições serão expostas apenas por um serviço de domínio server-side. Cada transição receberá pré-requisitos (atribuição, agenda, check-in, checklist e evidência) antes de atualizar o banco. A tela de criação manual e o despacho virão após a migration estar aplicada e exercitada em Supabase dev.
