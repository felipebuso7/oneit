# Backlog consolidado

| ID | Prioridade | Item / critério de aceite | Dependências | Status | Evidência |
|---|---|---|---|---|---|
| GOV-001 | P1 | Confirmar smoke test e commit efetivo no domínio Vercel | Acesso ao projeto Vercel | BLOCKED_EXTERNAL | Domínio/deployment não verificáveis nesta sessão; requer acesso Vercel |
| QA-001 | P1 | Executar E2E visual e RLS bilateral em ambiente autorizado | Credenciais de teste | BLOCKED_EXTERNAL | Requer dois usuários/tenants autorizados; `docs/QUALITY_STRATEGY.md` |
| OPS-001 | P2 | Medir restauração e RPO/RTO reais | Backup e ambiente isolado | BLOCKED_EXTERNAL | Requer backup e ambiente isolado; `docs/OPERABILITY.md` |
| BI-001 | P2 | Integrar consumo Power BI com credencial segregada | Decisão de integração | BLOCKED_DEPENDENCY | Requer definição do conector e credencial segregada |
| MTX-001 | P1 | Validar portal móvel completo em navegador/dispositivo real, incluindo WhatsApp, GPS, uploads e checkout | Ambiente E2E e dispositivo autorizado | BLOCKED_EXTERNAL | Requer dispositivo/navegador e credenciais; código nos commits `81751b3`, `4c1754f` |

Itens novos devem manter ID, prioridade, dependências, critério objetivo, status e evidência.
