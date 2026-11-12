# Dúvidas, premissas e limitações

## Confirmado

- Repositório, stack, rotas, migrations e testes foram inspecionados.
- Produção está publicada em `https://oneit-okaa1.vercel.app` e responde health/readiness.
- Staging Supabase está em `us-east-2`; as duas migrations LPU pendentes foram aplicadas com autorização.
- `/demo` é bloqueado em produção.

## Não verificado

- Se o projeto Supabase usado pela Vercel é exatamente o staging inspecionado em todos os ambientes.
- Homologação manual de cada rota e cada persona.
- Entrega efetiva de WhatsApp Business, e-mail, Google/Microsoft OAuth.
- Dados de produção, backup, restauração e carga real.
- Requisitos contratuais de SLA, contestação e fiscal além do código.

## Perguntas para decisão

1. Qual ambiente/organização será oficialmente produção e qual será homologação?
2. Qual provedor oficial de e-mail/WhatsApp será contratado e qual evidência de entrega é exigida?
3. Quais módulos ITSM (ativos, fornecedores, conhecimento, SGSTI) ficam no escopo operacional do OneIT?
4. Qual política de retenção/anonimização atende à LGPD?
5. Qual volume esperado de tickets, anexos e usuários define o benchmark?
