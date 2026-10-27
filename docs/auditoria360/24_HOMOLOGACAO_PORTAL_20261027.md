# Homologação do portal autenticado — 27/10/2026

## Ambiente e escopo

- Prévia Vercel protegida: `https://oneit-deig2fptn-okaa1.vercel.app`.
- Banco Supabase: projeto de teste `oneit-staging`, organização `OneIT Homologação`.
- Conta usada: `felipebuso7@hotmail.com`, com papel `SUPER_ADMIN` verificado no banco. A senha foi definida pelo próprio usuário e não foi compartilhada.
- O usuário confirmou o login e a navegação autenticada foi observada no navegador.
- Todos os registros abaixo são fictícios. Não houve envio de e-mail nem WhatsApp.

## Jornada executada pela interface

| Etapa | Evidência observada | Resultado |
| --- | --- | --- |
| Cadastro de cliente | `Cliente Homologação OneIT`, código `HML-CLIENTE-001`, reapareceu na lista | Aprovada |
| Cadastro de técnico | `Técnico Homologação OneIT` reapareceu na lista, com status `UNAVAILABLE` | Cadastro aprovado; gestão de disponibilidade pendente |
| Cadastro de localidade | `Polo Fictício Homologação` reapareceu com cidade São Paulo/SP | Aprovada |
| Catálogo | Categoria `HML-CABLING`, subcategoria `HML-RJ45` e oferta `HML-SERV-RJ45` reapareceram na estrutura | Aprovada |
| Chamado | `FSM-2026-000001` aberto, associado ao cliente e polo fictícios | Aprovada |
| Classificação | Oferta `HML-SERV-RJ45` aplicada e exibida no dossiê | Aprovada |
| Triagem | Status operacional passou de `NEW` para `TRIAGE` | Aprovada |
| Encaminhamento | Ação `Agendar` passou o chamado a `AWAITING_SCHEDULING`; indicador da central passou a 1 | Aprovada |
| Despacho | Técnico `UNAVAILABLE` pôde ser selecionado; formulário aceitou janela 28/10/2026 09:00–11:00. Após clicar em `Confirmar despacho`, a tela permaneceu com 1 aguardando despacho e 0 em campo, sem mensagem visível de sucesso ou erro | **Não validada; bloqueio operacional** |

## Achados

1. **P1 — Despacho sem feedback conclusivo.** A interface manteve o formulário e os indicadores sem mudança após a confirmação. O log de console visível não mostrou erro. Ainda não foi comprovado se a requisição foi enviada e rejeitada, ou se a ação foi impedida antes do envio. Verificar a requisição e o estado persistido antes de alterar a regra.
2. **P1 — Disponibilidade incoerente.** Novo técnico recebe `UNAVAILABLE`, aparece como opção de despacho e o cadastro do portal não oferece controle para torná-lo disponível. A função de banco `dispatch_ticket_to_field` valida `active`, mas não `status`. Definir separadamente elegibilidade cadastral, jornada e disponibilidade operacional antes de alterar a função.
3. **P2 — Cadastros ocultos.** `/portal/technicians` e `/portal/locations` existiam e funcionavam, mas não constavam no menu nem na página de Configurações. Links adicionados no código nesta rodada; ainda dependem de publicação e validação visual.
4. **P2 — Terminologia interna exposta.** A fila mostra `AWAITING_SCHEDULING`, e o cadastro mostra `UNAVAILABLE` em inglês. Mapear rótulos legíveis em português sem alterar os valores persistidos.
5. **P2 — Jornada de implantação pouco guiada.** O chamado exigiu cliente, polo e catálogo, mas a tela não orientou claramente os cadastros prévios. Melhorar estado vazio e ligações contextuais.

## Limites da validação

Não foram executados despacho concluído, mobile do técnico, assinatura, validação gerencial, RTO, BM ou envio. A prévia Vercel testada ainda não contém o commit mais recente do repositório. Este teste não constitui aprovação para produção.

## Próximo ciclo

1. Identificar a resposta da ação de despacho no navegador e confirmar se houve tentativa de gravação.
2. Corrigir o feedback da interface e a política de seleção de técnico indisponível, preservando a diferença entre disponibilidade e atividade cadastral.
3. Executar novamente despacho, jornada técnica, validação e RTO com dados de homologação.
4. Publicar a versão testada em prévia estável; repetir os testes na implantação exata antes de considerar o plano pago ou uso real.
