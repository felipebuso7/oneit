# Auditoria de workflows e estados

## Estados conceituais

Chamado, execução da OS, agendamento e disponibilidade do técnico representam dimensões diferentes e não devem ser confundidos.

## Field Service recomendado

`AGUARDANDO_TRIAGEM → AGUARDANDO_DESPACHO → AGENDADO → EM_DESLOCAMENTO → EM_ATENDIMENTO → AGUARDANDO_VALIDACAO → CONCLUIDO`

Exceções: `DEVOLVIDO_CORRECAO`, `REAGENDADO`, `SUSPENSO` e `CANCELADO`, sempre com motivo e ator.

## Medição recomendado

`RASCUNHO → CALCULADA → EM_VALIDACAO → ENVIADA_CLIENTE → AGUARDANDO_FISCAL → FECHADA`.

Contestação deve criar evento/versão, não alterar silenciosamente um BM já enviado.

## Achados

- Há funções transacionais e testes para várias transições críticas.
- Homologação em PostgreSQL e concorrência real continuam pendentes.
- A aprovação gerencial precisa continuar distinta do encerramento técnico.
