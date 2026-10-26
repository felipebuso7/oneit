# Ciclo Field Service → validação → medição

Data: 25/10/2026. Ambiente testado: demonstração local em `http://localhost:3000`. Os dados desta prova ficam no `localStorage` desta origem; a origem `127.0.0.1:3000` mantém dados demonstrativos separados.

## Fatos confirmados na interface

1. Criei o chamado demonstrativo `REQ-0290` no catálogo (`Redes` → `Wi-Fi Oscilando`). O chamado entrou na fila, foi enviado ao Field e o despacho foi inicialmente bloqueado por falta de endereço.
2. Com o seletor de polo adicionado ao despacho, escolhi `Sabesp · Polo Atibaia`, janela `09:00 — 10:00` e um técnico interno. A confirmação criou a visita no Field.
3. Na tela do técnico, registrei deslocamento, chegada, início do serviço, descrição, resultado, observação de evidência, consumo de um RJ45, nome e assinatura demonstrativa. O botão de material estava bloqueado por um estado interno que a seleção visível não preenchia; a correção foi testada na própria interface.
4. O checkout encaminhou a OS à fila do gestor. A fila mostrou serviço, material, assinatura, horário de encerramento e observação. O horário era ilegível porque o mobile gravava data localizada em um campo diferente do lido pelo gestor; novos registros passam a gravar ISO e a tela lê também os registros anteriores.
5. Apliquei `LPU-RED-001` por R$ 220 na validação. O chamado foi fechado pela ação de validar RTO. O BM de outubro passou a listar uma OS, total de R$ 220, com `LPU-RED-001`; o RJ45 consumido não aparece como cobrança adicional de R$ 0.

Captura da medição: [BM demonstrativo](evidencias/bm-req-0290-validado.png).

## Correções deste ciclo

| Área | Causa observada | Alteração |
| --- | --- | --- |
| Despacho | Chamado novo sem polo/endereço não podia avançar | Seleção do polo cadastrado na própria etapa de planejamento; grava empresa, polo e endereço na OS |
| Mobile | A validação de material consultava um campo que o seletor não atualizava | Usa o item efetivamente selecionado; preço de consumo permanece zero para decisão do gestor |
| Checkout | Campo de conclusão e formato de data divergiam entre telas | Grava `technicianCompletedAt`/`checkedOutAt` em ISO; leitura compatível com data legada |
| Evidência | Observação do técnico não era reconhecida na validação | Propaga a observação assinada como evidência textual, com leitura compatível para registros anteriores |
| LPU | Validação nova não permitia precificar | Aplica item ativo da LPU na OS pendente, grava código, descrição e preço, com histórico |
| Fechamento/BM | Fechamento pelo chamado não gravava `completedAt` | Grava conclusão; BM aceita `managerValidatedAt` para registros demonstrativos anteriores |
| BM | Material usado sem cobrança gerava linha de R$ 0 | Exclui itens de consumo com preço zero das linhas financeiras e apresenta código da LPU de serviço |

## Validação e limites

- Fluxo acima confirmado visualmente no navegador local, inclusive fechamento e inclusão da OS no BM.
- `vitest`: 4 arquivos, 8 testes passaram, incluindo cálculo da composição sem duplicar o RJ45.
- `npm run typecheck`: passou após todos os ajustes. ESLint direcionado aos arquivos alterados: passou sem avisos.
- Houve uma falha transitória do servidor de desenvolvimento: `Manifest file is empty` durante recompilação. Recarregar restaurou a aplicação; a causa do processo/manifest ainda não foi isolada.
- O fluxo testado é demonstrativo, baseado em `localStorage`. Não valida persistência transacional, permissões reais, envio de WhatsApp/e-mail, produção ou PDF do RTO.
- Materiais antigos com `unitPrice > 0` ainda entram como extras no BM. É preciso revisar a regra contratual e a origem desses preços antes de alterar cobranças históricas.
- A tela legada de Field ainda contém ações administrativas paralelas e a geração de RTO segue em rota separada. A centralização completa e a integração persistida continuam pendentes.
