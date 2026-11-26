# Matriz de riscos

| Risco | Probabilidade | Impacto | Mitigação | Estado |
|---|---:|---:|---|---|
| Deployment não acompanha Git | Média | Alto | confirmar `/api/version` e deployment Vercel | Aberto |
| Guard de tenant regressivo | Baixa | Crítico | teste bilateral e migration aplicada | Parcial |
| Falha de build não observada | Média | Alto | executar em CI com logs completos | Aberto |
| Dados demo confundidos com produção | Média | Médio | bloquear rotas demo no release produtivo | Aberto |
