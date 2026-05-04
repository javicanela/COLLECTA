# WhatsApp Evolution API Spec

## Decision

Evolution API es la opcion oficial de WhatsApp programatico solo si se puede
self-hostear sin costo de servicio. `wa.me` queda como fallback manual.

## Variables

- `EVOLUTION_API_URL`
- `EVOLUTION_INSTANCE`
- `EVOLUTION_API_KEY`
- `EVOLUTION_WEBHOOK_SECRET`
- `PAYMENT_DETECTION_WEBHOOK_URL`

## Backend actual

Rutas protegidas por `requireAuth`:

- `GET /api/whatsapp/status`
- `POST /api/whatsapp/send`
- `POST /api/whatsapp/send-media`

Webhook inbound:

- `POST /api/webhooks/evolution`
- Usa `X-Webhook-Secret` si `EVOLUTION_WEBHOOK_SECRET` esta configurado.

Tracking:

- `WhatsAppMessage` registra direccion, tipo, telefono, contenido, media,
  `evolutionMsgId`, status y relaciones opcionales con cliente/operacion.
- `LogEntry` registra eventos de envio y recepcion.

## Reglas

- No enviar a clientes `SUSPENDIDO` salvo override explicito.
- No enviar mensajes masivos sin rate limit y log.
- No usar Evolution si no esta configurado.
- Si Evolution falla, mostrar error y ofrecer fallback manual.
- No exponer API keys en frontend.
- No guardar secretos en `Config`.

## n8n

Los workflows que llaman `/api/n8n/*` deben usar:

```http
Authorization: Bearer <API_KEY>
```

El webhook Evolution hacia backend debe usar:

```http
X-Webhook-Secret: <EVOLUTION_WEBHOOK_SECRET>
```

## Pendiente

- Validar costo real de self-host.
- Confirmar envio de documentos PDF por Evolution en el entorno final.
- Agregar tracking de reintentos.
- Definir limites por hora/dia.
