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

## Pendiente

- Definir ejecutor real del agente.
- Conectar acciones aprobadas con n8n/Evolution.
- Persistir resultado de cada accion.
- Evitar duplicados y reintentos peligrosos.
- Agregar monitoreo y alertas.
