# Collecta n8n Workflows

Esta carpeta contiene workflows n8n para automatizaciones de Collecta. Los
workflows deben coincidir con la autenticacion real del backend.

## Workflows activos

```text
n8n/workflows/
  01_reporte_diario_cartera.json
  02_cobranza_automatica_whatsapp.json
  03_deteccion_pagos_gemini_vision.json
  04_cobranza_email_pdf.json
```

## Variables necesarias

- `COLLECTA_API_URL`
- `API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `EVOLUTION_API_URL`
- `EVOLUTION_INSTANCE`
- `EVOLUTION_API_KEY`
- `EVOLUTION_WEBHOOK_SECRET`
- `GEMINI_API_KEY` o provider equivalente si se habilita deteccion cloud

Las llaves cloud son opcionales. La arquitectura de Smart Import y deteccion debe
ser provider-agnostic.

## Autenticacion backend

`/api/n8n/*` requiere:

```http
Authorization: Bearer <API_KEY>
```

`/api/webhooks/evolution` usa:

```http
X-Webhook-Secret: <EVOLUTION_WEBHOOK_SECRET>
```

## Ejemplos curl

Reporte diario:

```bash
curl "$COLLECTA_API_URL/api/n8n/daily-report" \
  -H "Authorization: Bearer <API_KEY>"
```

Pendientes de cobranza:

```bash
curl "$COLLECTA_API_URL/api/n8n/pending-collections" \
  -H "Authorization: Bearer <API_KEY>"
```

Confirmacion de pago:

```bash
curl -X POST "$COLLECTA_API_URL/api/n8n/webhook/payment-confirmed" \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"rfc":"XAXX010101000","monto":2100,"referencia":"REF123"}'
```

Webhook Evolution:

```bash
curl -X POST "$COLLECTA_API_URL/api/webhooks/evolution" \
  -H "X-Webhook-Secret: <EVOLUTION_WEBHOOK_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"event":"messages.upsert","data":{}}'
```

## Notas de configuracion

- Si n8n corre en otro contenedor/host, `COLLECTA_API_URL` debe apuntar al backend
  accesible desde n8n.
- No usar `localhost` en produccion salvo que n8n y backend compartan el mismo
  entorno de red.
- Evolution API solo sera flujo oficial si puede self-hostearse sin costo de
  servicio. Mientras tanto, `wa.me` queda como fallback manual.

## Problemas comunes

| Problema | Revision |
|---|---|
| 401 en `/api/n8n/*` | Falta `Authorization: Bearer <API_KEY>` o el token no coincide. |
| 403 en webhook Evolution | Falta o no coincide `X-Webhook-Secret`. |
| n8n no conecta | Revisar `COLLECTA_API_URL` desde el entorno de n8n. |
| WhatsApp falla | Revisar Evolution API URL, instancia, API key y estado de conexion. |
