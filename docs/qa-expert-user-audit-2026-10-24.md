# Auditoria exploratória — usuário avançado

Data: 24/10/2026  
Escopo: chamadas, Field Service, cadastros de Field e fluxo técnico externo.

## Evidências confirmadas

- A suíte automatizada do checkout foi executada com sucesso: **51 arquivos / 110 testes** aprovados.
- A checagem de tipos foi aprovada.
- As telas de dashboard, fila de chamados, central de Field, despacho, configurações de Field e cadastro de técnicos foram abertas e inspecionadas visualmente.
- O portal de despacho expõe os três dados obrigatórios de agendamento: OS, data/janela e técnico, além do acesso à agenda de conflitos.
- O fluxo técnico externo implementado no código exige deslocamento, check-in, evidência, relatório, assinatura e checkout; as regras críticas também estão protegidas por migration SQL.

## Bloqueadores encontrados

### B1 — o `localhost:3000` visual não corresponde ao checkout auditado

Na navegação visual, a página de técnicos exibida em `localhost:3000` não continha o formulário existente no código atual. As ações de interface não dispararam os handlers React e o envio nativo do formulário resultou em query string. Como o processo que atende esse endereço não apareceu na inspeção do workspace, esse ambiente não pode homologar as alterações atuais.

Impacto: não é possível afirmar que salvar, editar, desativar, criar chamado ou despachar funcionam no build que será entregue até que seja iniciado um servidor a partir deste checkout.

Correção proposta:

1. Encerrar ou identificar o servidor estranho ligado ao navegador.
2. Iniciar o ambiente a partir de `servicia-fsm`.
3. Reexecutar os casos de teste em duas sessões independentes: gestor e técnico.

### B2 — build de produção não aprovado

O comando `npm run build` não gerou `.next/BUILD_ID`. O arquivo `.next/trace-build` registrou `next-build` e `run-webpack` com `failed: true`.

Impacto: a aplicação não deve seguir para VPS enquanto a compilação otimizada não terminar com êxito.

Observação: o output disponível não contém a causa do compilador; portanto, a causa ainda não está confirmada.

## Pendências de qualidade

| Prioridade | Tarefa | Critério de aceite |
| --- | --- | --- |
| P0 | Corrigir build de produção e registrar o erro raiz | `npm run build` termina com sucesso e cria `BUILD_ID`. |
| P0 | Vincular o ambiente local ao checkout correto | URL local mostra as alterações recentes e handlers React funcionam. |
| P0 | Executar teste ponta a ponta em gestor + técnico | OS percorre despacho, deslocamento, check-in, evidências, assinatura, checkout, validação e RTO. |
| P1 | Criar testes E2E reais | Cobertura de salvar/editar/desativar técnico, criar chamado e despacho sem depender somente de testes de contrato. |
| P1 | Testar migrations em Supabase de homologação | Transições inválidas são recusadas pelo banco e storage privado recebe evidências. |
| P2 | Criar matriz de navegação por papel | Administrador, gestor e técnico têm apenas as telas e ações compatíveis com a permissão. |

## Conclusão

O código tem cobertura automatizada útil, mas a homologação de usuário avançado ainda está bloqueada por ambiente local divergente e build de produção não aprovado. Isso impede uma recomendação responsável de publicação em VPS neste momento.
