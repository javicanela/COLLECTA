# WhatsApp Evolution API Spec

## Decision

Evolution API es la opcion oficial de WhatsApp programatico solo si se puede
self-hostear sin costo de servicio. `wa.me` queda como fallback manual.

Validacion 2026-05-04:

- Evolution API se declara open source y soporta una conexion WhatsApp API
  basada en Baileys/WhatsApp Web. Esa via se describe como API gratuita, con
  limitaciones frente a APIs oficiales.
- Evolution API tambien soporta WhatsApp Cloud API oficial de Meta. Esa opcion
  puede implicar pago por volumen y cumplimiento de politicas de Meta; no es el
  camino default de Collecta.
- La licencia publicada es Apache 2.0 con condiciones adicionales: preservar
  logos/copyright si se usan componentes frontend de Evolution y mostrar una
  notificacion visible para administradores/documentacion indicando que se usa
  Evolution API.
- La documentacion oficial indica despliegue Docker/Compose y requiere servicios
  auxiliares. El costo de servicio puede ser cero solo si se opera self-host, sin
  soporte premium ni proveedor administrado; sigue existiendo costo de hosting,
  almacenamiento, dominio/TLS, backups, monitoreo y operacion.

Fuentes:

- https://github.com/EvolutionAPI/evolution-api
- https://doc.evolution-api.com/v2/en/install/docker
- https://doc.evolution-api.com/v2/en/requirements/database

## Infra requerida

Minimo self-host:

- 1 servicio Evolution API expuesto solo por HTTPS.
- Docker Compose o runtime equivalente.
- PostgreSQL o MySQL para persistencia de instancias/mensajes/contactos.
- Redis cuando la configuracion de Evolution lo requiera para cache/colas.
- Volumen persistente para sesiones/instancias.
- API key propia (`AUTHENTICATION_API_KEY`) y webhook secret fuerte.
- Backups de DB y volumen de sesiones.
- Logs, health checks y alertas de desconexion.
- IP/dominio estable para que Evolution pueda llamar
  `POST /api/webhooks/evolution`.

No-go:

- No usar Evolution Cloud API/Meta Cloud API como default si introduce costo de
  servicio obligatorio.
- No guardar llaves Evolution en `Config`.
- No exponer `EVOLUTION_API_KEY` ni `EVOLUTION_WEBHOOK_SECRET` al frontend.

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

Estados operativos:

- `GET /api/whatsapp/status` responde `not_configured`, `open`/estado de
  instancia, o `error`. El error se sanitiza como `connection_check_failed`.
- `POST /api/whatsapp/send` y `/send-media` rechazan Evolution no configurado
  con `503 evolution_not_configured` y registran el intento como fallido.
- Si Evolution responde fallo, el backend guarda `WhatsAppMessage.status =
  FAILED` y `LogEntry.resultado = ERROR`.
- Si un cliente esta `SUSPENDIDO`, el backend bloquea con `403
  client_suspended`, guarda `WhatsAppMessage.status = BLOCKED` y
  `LogEntry.resultado = BLOQUEADO`.
- Override explicito: `overrideSuspendedClient: true` permite el envio
  programatico a un cliente suspendido y queda auditado como envio normal.

Rate limit saliente:

- Politica de backend en `/api/whatsapp/send` y `/api/whatsapp/send-media`.
- Ventana: 60 segundos.
- Produccion: 30 requests por minuto por identidad/IP segun
  `express-rate-limit`.
- Desarrollo/test: limite alto para no bloquear pruebas locales.
- Respuesta al exceder: `429 outbound_rate_limit_exceeded` con fallback manual
  `wa.me`.

## Reglas

- No enviar a clientes `SUSPENDIDO` salvo override explicito.
- No enviar mensajes masivos sin rate limit y log.
- No usar Evolution si no esta configurado.
- Si Evolution falla, mostrar error y ofrecer fallback manual.
- No exponer API keys en frontend.
- No guardar secretos en `Config`.
- El fallback manual `wa.me` sigue siendo la experiencia primaria de UI hasta
  que Evolution este conectado y validado operacionalmente.
- La UI solo consulta `/api/whatsapp/status`; no conoce llaves ni URL interna de
  Evolution.

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

- Confirmar envio de documentos PDF por Evolution en el entorno final.
- Agregar tracking de reintentos.
- Definir limites por hora/dia por tenant cuando exista multi-tenant real.
