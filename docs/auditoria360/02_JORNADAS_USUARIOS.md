# Jornadas de usuários — diagnóstico inicial

## Administrador

**Caminho observado:** autenticação → portal → organizações/usuários → configurações → técnicos/LPU/serviços.  
**Risco:** não há um assistente único que indique dependências e pendências de implantação. O administrador precisa conhecer a ordem dos cadastros.  
**Melhoria:** checklist de onboarding por organização, com bloqueios explicados e links diretos.

## Gestor de TI / Field Service

**Caminho observado:** Chamados → detalhe → despacho/agendamento → Field Service → revisão/RTO → fechamento.  
**Ponto positivo:** existem rotas, APIs de dispatch, revisão, RTO e contratos de concorrência.  
**Risco:** a conclusão operacional depende de várias superfícies e a integração visual entre chamado, OS e validação ainda precisa de E2E real.  
**Critério de aceite:** despachar, atualizar agenda, receber retorno e aprovar/devolver sem duplicação de registro.

## Técnico

**Caminho observado:** acesso parceiro temporário → aceite/check-in → evidências → assinatura → submissão/checkout.  
**Ponto positivo:** testes cobrem código de acesso, eventos, evidências, assinatura e retry parcial.  
**Risco:** materiais/LPU permanecem responsabilidade do gestor; isso deve ser explícito na UI e no RTO para não induzir o técnico a lançar cobrança. Conectividade móvel real não foi validada.

## Solicitante

**Caminho observado:** catálogo/chamado → acompanhamento → comunicação/fechamento.  
**Risco:** importação por API do sistema cliente e confirmação de notificações não foram demonstradas neste ambiente.

## Financeiro

**Caminho observado:** competência → medição/BM → contestação → e-mail fiscal → fechamento.  
**Ponto positivo:** APIs de transição, contestação, versões e idempotência possuem contratos.  
**Risco:** o executor que transforma fila em envio real não foi encontrado no repositório; não é possível afirmar que o e-mail seja disparado.

## Jornadas de exceção prioritárias

- técnico indisponível ou conflito de agenda;
- OS devolvida para correção após assinatura;
- falha de rede após submissão;
- envio de BM aceito pelo provedor versus entrega confirmada;
- usuário de outra organização tentando acessar registro direto.

Esses casos devem ser homologados com dados fictícios e banco isolado antes do go-live.
