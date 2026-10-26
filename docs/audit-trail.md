# Trilha de auditoria

## Decisão atual

`audit_logs` é a fonte de eventos administrativos e operacionais. Os registros passam a ser append-only: `UPDATE` e `DELETE` são bloqueados no banco. Cada evento recebe um hash SHA-256 calculado com sua identidade, conteúdo, origem, correlação e instante de criação.

## Limites

- O hash detecta alteração no conteúdo de um evento, mas não substitui retenção externa, backups imutáveis ou SIEM.
- O encadeamento global de hashes não foi adotado nesta fase: exigiria serialização por organização e aumentaria contenção. Será reavaliado quando houver requisito formal de evidência criptográfica encadeada.
- `timestamptz` é persistido em UTC pelo PostgreSQL. A apresentação local e calendário operacional ainda serão incrementos próprios.

## Consulta

Administradores organizacionais e auditores podem consultar os eventos das organizações autorizadas em `/portal/audit`. A tela é somente leitura.
