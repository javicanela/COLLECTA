# Agent Runtime Spec

## Proposito

El agente de Collecta representa una operacion controlada de cobranza: revisar
clientes y operaciones, proponer acciones, permitir aprobacion/cancelacion y
registrar resultados.

Codex es la herramienta principal para cambios de repositorio. No existe PC1/PC2
ni sistema `.ai-*` dentro del producto.

## Estado actual

Existe soporte parcial en:

- `backend/prisma/schema.prisma`: `AgentExecution`, `AgentAction`, `AgentConfig`.
- `backend/src/routes/agent.ts`: dashboard, estado, historial, start/stop/pause,
  acciones pendientes, aprobacion/cancelacion y config.
- `frontend/src/views/AgentView.tsx`: vista de operador.

## Endpoints actuales

Todos viven bajo `/api/agent` y estan protegidos por `requireAuth`:

- `GET /dashboard`
- `GET /execution/status`
- `GET /execution/history`
- `GET /execution/:id`
- `POST /execution/start`
- `POST /execution/stop`
- `POST /execution/pause`
- `POST /execution/resume`
- `GET /actions/pending`
- `POST /actions/cancel/:id`
- `POST /actions/cancel-all`
- `POST /actions/approve/:id`
- `GET /config`
- `PUT /config`
- `GET /operations/pending`
- `GET /clients/active`

## Reglas

- No enviar mensajes sin rate limit.
- No ejecutar acciones masivas sin aprobacion o configuracion explicita.
- No tocar secretos desde el agente.
- No crear carpetas `.ai-*`.
- n8n debe autenticarse con `Authorization: Bearer <API_KEY>` o JWT.
- Los webhooks de Evolution usan `X-Webhook-Secret`.

## Lifecycle de operador

- `IDLE`: no hay ejecucion conocida o activa.
- `RUNNING`: el agente esta planificando, esperando aprobaciones o preparando handoff.
- `PAUSED`: no se pueden aprobar nuevas acciones hasta reanudar.
- `STOPPED`: el operador detuvo la ejecucion; acciones pendientes o en handoff quedan canceladas.
- `FAILED`: la ejecucion fallo y debe revisarse en historial.
- `COMPLETED`: el planner termino sin acciones nuevas o la ejecucion cerro correctamente.

## Politica de acciones

| Accion | Canal | Automatico | Requiere aprobacion | Riesgo | Nota |
|---|---|---:|---:|---|---|
| `FOLLOWUP` | Interno | Si | No | Bajo | Solo registra seguimiento interno. |
| `WHATSAPP_MESSAGE` | WhatsApp | No | Si | Medio | Comunicacion externa; requiere operador. |
| `WHATSAPP_PDF` | WhatsApp | No | Si | Alto | Envio externo con documento; requiere operador. |
| `EMAIL` | Email | No | Si | Medio | Comunicacion externa; requiere operador. |

En Phase 5, aprobar una accion no envia directamente. Solo mueve la accion a
`EXECUTING` como handoff controlado para que WhatsApp/n8n se conecten despues de
estabilizar Phase 4.

## Auditoria y limites

- `POST /execution/start` crea `AgentExecution` y acciones `PENDING`; nunca llama
  senders externos.
- La deduplicacion evita crear otra accion diaria para el mismo `tenantId`,
  `clientId` y `type` si ya existe en `PENDING`, `EXECUTING` o `COMPLETED`.
- `maxDailySends` limita cuantas acciones externas puede planificar/aprobar el
  agente durante el dia.
- `POST /actions/approve/:id` registra `LogEntry` con
  `AGENT_ACTION_APPROVED` antes de pasar a `EXECUTING`.
- `POST /execution/stop`, `POST /actions/cancel/:id` y
  `POST /actions/cancel-all` cancelan acciones pendientes o en handoff.

## Pendiente

- Definir ejecutor real del agente.
- Conectar acciones aprobadas con n8n/Evolution.
- Persistir resultado de cada accion.
- Evitar duplicados y reintentos peligrosos.
- Agregar monitoreo y alertas.
