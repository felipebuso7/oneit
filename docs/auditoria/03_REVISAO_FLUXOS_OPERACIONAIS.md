# Revisão dos fluxos operacionais — levantamento inicial

As conclusões abaixo derivam de leitura de código selecionado, não de uma simulação ponta a ponta em ambiente integrado.

## Chamado → Field → técnico → gestor

**Atual:** telas demonstrativas manipulam chamados e visitas no navegador (`src/app/demo/field-service/dispatch/page.tsx` e `page.tsx`); há também despacho transacional no banco (`20261024131000_atomic_field_dispatch.sql`) e acesso temporário para parceiro.

**Problema:** coexistem caminhos local e persistente; não se comprovou que a OS encerrada por parceiro chegue à fila real e que o encerramento do gestor sincronize chamado, RTO e faturamento. Aceite, deslocamento e redistribuição têm dependências de migrations não homologadas.

**Recomendado:** chamado persistido → atribuição com agenda → acesso de técnico limitado → aceite/check-ins/evidências → revisão do gestor → encerramento atômico e RTO versionado. Definir responsável e tratamento de cancelamento, recusa, perda de conexão e acesso expirado. Impacto: contratos, interface e migrações; alteração estrutural requer aprovação e testes de regressão.

## BM → validação → fiscal

**Atual:** páginas demo de financeiro e fiscal guardam estados em `localStorage`; `fiscal/page.tsx` registra fechamento local com mensagem de e-mail, enquanto existem APIs e provider separados.

**Problema:** o estado local não é compartilhado nem imutável e não comprova entrega. O backend financeiro tem mecanismos declarados, mas o caminho completo PDF/anexo/planilha/provedor/fechamento não foi executado.

**Recomendado:** consolidar OS fechadas por competência no servidor, congelar preços e versão, permitir revisão/devolução, enviar pelo worker e só registrar entrega fiscal efetiva com comprovante do provedor. Diferenciar enfileirado, enviado e falhou; nunca alegar envio com base apenas na UI.

**Evidência adicional:** a transição `CLOSED` da função SQL registra `final_email_sent_at` sem consultar o log de e-mail. Além disso, a busca em `src` e `scripts` encontrou a definição de `sendBillingEmail`, mas nenhuma chamada a ela; existem endpoints de claim e resultado. Isso não exclui um worker externo não presente no repositório, mas impede afirmar que o envio automático esteja integrado ou operacional.

## Cadastros, catálogo e outros módulos

Há cadastros e APIs, mas criação, edição, desativação, vínculo por empresa e permissões ainda necessitam execução com duas organizações. SGSTI/inventário e módulos herdados não foram auditados em profundidade nesta etapa. Fazer inventário de telas, estados de erro, acessibilidade e navegação com roteiro de QA, sem assumir que a demonstração represente produção.
