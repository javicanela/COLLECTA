# Collecta n8n Workflows

Esta carpeta contiene workflows n8n para automatizaciones de Collecta. Los
workflows deben coincidir con la autenticacion real del backend Express.

## Workflows activos

```text
n8n/workflows/
  01_reporte_diario_cartera.json
  02_cobranza_automatica_whatsapp.json
  03_deteccion_pagos_gemini_vision.json
  04_cobranza_email_pdf.json
```

## Variables necesarias en n8n

- `COLLECTA_API_URL`
- `BACKEND_PUBLIC_URL` o `PUBLIC_API_BASE_URL`
- `API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `EVOLUTION_API_URL`
- `EVOLUTION_INSTANCE`
- `EVOLUTION_API_KEY`
- `EVOLUTION_WEBHOOK_SECRET`
- `GEMINI_API_KEY` o provider equivalente si se habilita deteccion cloud
- `EMAIL_PROVIDER`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `RESEND_API_KEY`

Las llaves cloud son opcionales. La arquitectura de Smart Import y deteccion debe
ser provider-agnostic.

`BACKEND_PUBLIC_URL` o `PUBLIC_API_BASE_URL` debe apuntar al backend desde la red
donde Evolution API descarga archivos. Si Evolution no corre en el mismo host que
el backend, `http://localhost:3001` no servira para adjuntos PDF.

## Autenticacion backend

Las llamadas n8n hacia rutas protegidas de Collecta requieren:

```http
Authorization: Bearer <API_KEY>
```

Esto aplica a:

- `/api/n8n/*`
- `/api/logs`
- `/api/cobranza/*`

Los workflows exportados usan el header:

```text
Authorization: =Bearer {{$env.API_KEY}}
```

`API_KEY` debe ser exactamente el mismo valor configurado en el backend.

## Webhooks entrantes

`/api/webhooks/evolution` no usa Bearer auth. Ese endpoint usa su propio secreto:

```http
X-Webhook-Secret: <EVOLUTION_WEBHOOK_SECRET>
```

No mezclar `Authorization` con el webhook Evolution salvo que el backend cambie
explicitamente su contrato.

## Runbook de configuracion n8n

1. Configura `API_KEY` en el backend con un valor aleatorio de al menos 32
   caracteres.
2. Configura el mismo `API_KEY` en el entorno de n8n.
3. Configura `COLLECTA_API_URL` apuntando al backend accesible desde n8n, sin
   slash final.
4. Configura `EVOLUTION_WEBHOOK_SECRET` en backend, n8n y Evolution API si el
   webhook de WhatsApp esta habilitado.
5. Importa los JSON desde `n8n/workflows/`.
6. Abre cada nodo HTTP de Collecta y confirma:
   - `Send Headers` activo.
   - Header `Authorization` presente.
   - Valor `=Bearer {{$env.API_KEY}}`.
7. Ejecuta primero en modo manual y revisa que los nodos Collecta no devuelvan
   `401`.

Si n8n corre en otro contenedor/host, `COLLECTA_API_URL` debe apuntar al backend
desde la red de n8n. No usar `localhost` en produccion salvo que n8n y backend
compartan el mismo entorno de red.

## Validacion de workflows

Antes de activar un workflow:

- Validar que todos los nodos HTTP hacia `/api/n8n/*`, `/api/logs` y
  `/api/cobranza/*` tengan `Authorization: Bearer {{$env.API_KEY}}`.
- Validar que los nodos externos con su propio contrato no reciban ese header:
  Telegram, Gemini y Evolution API.
- Validar que el webhook Evolution documentado y configurado use
  `X-Webhook-Secret`.
- Ejecutar los curl de smoke test de esta guia contra el mismo backend que usara
  n8n.
- Confirmar que no se guardaron secretos reales en los JSON exportados.

## Ejemplos curl

Auth faltante en reporte diario. Debe responder `401`:

```bash
curl -i "$COLLECTA_API_URL/api/n8n/daily-report"
```

Reporte diario:

```bash
curl "$COLLECTA_API_URL/api/n8n/daily-report" \
  -H "Authorization: Bearer $API_KEY"
```

Pendientes de cobranza:

```bash
curl "$COLLECTA_API_URL/api/n8n/pending-collections" \
  -H "Authorization: Bearer $API_KEY"
```

Deteccion de pago:

```bash
curl -X POST "$COLLECTA_API_URL/api/n8n/payment-detections" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"rfc":"XAXX010101000","monto":2100,"fechaPago":"2026-05-04","referencia":"REF123","provider":"gemini-vision"}'
```

Crear log desde workflow:

```bash
curl -X POST "$COLLECTA_API_URL/api/logs" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tipo":"N8N_SMOKE_TEST","resultado":"ENVIADO","mensaje":"Smoke test n8n","modo":"PRUEBA"}'
```

Generar PDF de cobranza para un RFC existente:

```bash
curl "$COLLECTA_API_URL/api/cobranza/cliente/XAXX010101000/pdf" \
  -H "Authorization: Bearer $API_KEY" \
  --output estado_cuenta_test.pdf
```

Enviar estado de cuenta por flujo integrado PDF + WhatsApp media + email
configurable + fallback manual:

```bash
curl -X POST "$COLLECTA_API_URL/api/cobranza/cliente/XAXX010101000/send-statement" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"channelPreference":"AUTO"}'
```

La URL temporal en la respuesta usa token aleatorio largo y TTL corto. No requiere
`Authorization` para que Evolution API pueda descargar el PDF, por lo que debe
tratarse como URL firmada efimera.

Webhook Evolution:

```bash
curl -X POST "$COLLECTA_API_URL/api/webhooks/evolution" \
  -H "X-Webhook-Secret: $EVOLUTION_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"event":"messages.upsert","data":{}}'
```

## Problemas comunes

| Problema | Revision |
|---|---|
| 401 en `/api/n8n/*` | Falta `Authorization: Bearer <API_KEY>` o el token no coincide. |
| 401 en `/api/logs` o `/api/cobranza/*` | El nodo HTTP de n8n no esta enviando `API_KEY`. |
| 403 en webhook Evolution | Falta o no coincide `X-Webhook-Secret`. |
| n8n no conecta | Revisar `COLLECTA_API_URL` desde el entorno de n8n. |
| WhatsApp falla | Revisar Evolution API URL, instancia, API key y estado de conexion. |

Evolution API solo sera flujo oficial si puede self-hostearse sin costo de
servicio. Mientras tanto, `wa.me` queda como fallback manual.
