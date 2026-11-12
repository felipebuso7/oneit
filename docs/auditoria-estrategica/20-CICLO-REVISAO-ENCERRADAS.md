# Ciclo 20 — separação visual das OS encerradas

Na revisão gerencial, registros `APPROVED` com chamado `CLOSED` apareciam como cartões de trabalho pendente, misturados às OS que ainda exigem RTO ou encerramento. A tela agora usa o status administrativo do chamado, já consultado nela, para separar os concluídos em uma lista compacta com acesso ao PDF registrado.

A consulta, a autorização e os registros foram preservados. O contador de aprovadas continua representando todos os registros aprovados, inclusive os encerrados. A separação ocorre nos registros da página atual; a paginação ainda não prioriza globalmente os pendentes. Isso permanece como limitação a tratar em consulta ao banco, sem perder histórico.

Mudança local, sem migration e sem publicação. A validação visual e o fluxo com Supabase real seguem pendentes.
