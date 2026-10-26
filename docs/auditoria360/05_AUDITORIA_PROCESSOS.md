# Auditoria de processos operacionais

## Atendimento de campo

**Fluxo desejado:** chamado aberto → triagem → despacho → agenda → comunicação → deslocamento → check-in → execução → assinatura/evidências → encerramento técnico → validação → aprovação/devolução → RTO/fechamento.

**Fragilidade atual:** os contratos de cada etapa existem, mas a jornada integrada não foi executada com persistência real. A principal decisão de produto é manter o lançamento de LPU na validação do gestor, enquanto o técnico registra execução e evidências.

## Medição e faturamento

**Fluxo desejado:** competência → seleção de OS fechadas → cálculo → revisão → envio BM → contestação → fiscal → fechamento imutável.

**Fragilidade atual:** o backend possui endpoints de fila e resultado, mas o worker que efetivamente envia e-mails não está presente no repositório. Portanto, “enviado” não pode ser considerado comprovado.

## Cadastro e implantação

**Fluxo recomendado:** organização → usuários/perfis → clientes/contratos → polos/endereço → catálogo → técnicos/competências → LPU → integração → validação da operação.

**Melhoria prioritária:** checklist de implantação com dependências, validações e pendências visíveis.

## Governança das transições

Toda transição crítica deve registrar ator, data/hora, motivo e entidade relacionada. Devoluções não podem apagar assinatura, evidência ou histórico anterior.
