# n8n E2E Connectivity Checklist

Scope: validate n8n workflow exports and manual connectivity without sending real customer messages or exposing secrets.

## Required Variables

Configure these in n8n environment or credentials as appropriate. Use test/staging values only.

| Variable | Used by | Notes |
|---|---|---|
| `COLLECTA_API_URL` | All Collecta HTTP nodes | Backend base URL reachable from n8n, no trailing slash. |
| `API_KEY` | All protected Collecta routes | Must match backend `API_KEY`. Sent as `Authorization: Bearer {{$env.API_KEY}}`. |
| `BACKEND_PUBLIC_URL` or `PUBLIC_API_BASE_URL` | Statement/media delivery | Needed when external services must fetch temporary PDFs. |
| `TELEGRAM_BOT_TOKEN` | Workflows 01, 02, 03 | External Telegram node; do not add Collecta Bearer auth. |
| `TELEGRAM_CHAT_ID` | Workflows 01, 02, 03 | Test chat only. |
| `EVOLUTION_API_URL` | Workflow 02 and backend WhatsApp service | Optional; use self-host/test instance only. |
| `EVOLUTION_INSTANCE` | Workflow 02 and backend WhatsApp service | Optional. |
| `EVOLUTION_API_KEY` | Workflow 02 and backend WhatsApp service | External API key; keep in environment. |
| `EVOLUTION_WEBHOOK_SECRET` | Evolution webhook | Used with `X-Webhook-Secret`, not Collecta Bearer. |
| `GEMINI_API_KEY` or provider equivalent | Workflow 03 | Optional OCR/vision provider. Avoid sensitive data. |
| `EMAIL_PROVIDER` | Backend statement delivery | Optional. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP provider | Optional. |
| `EMAIL_FROM` | Email provider | Optional. |
| `RESEND_API_KEY` | Resend provider | Optional. |

## Export Integrity Checks

Worker B automated test:

```powershell
cd "C:\Users\LENOVO\Documents\New project\backend"
npx vitest run src/__tests__/n8nWorkflowsIntegrity.test.ts
```

Expected result:

- The four JSON files parse successfully.
- Exported workflow strings do not contain literal API keys, JWTs, private keys, or hardcoded Bearer tokens.
- Protected Collecta HTTP nodes use `Authorization: Bearer {{$env.API_KEY}}`.
- External Telegram/Gemini/Evolution nodes are not forced into Collecta Bearer auth.
- Workflow 04 references `/api/cobranza/cliente/:rfc/send-statement` when the backend route exists.

## Collecta Auth Rules

Protected Collecta routes in workflows must include:

```text
Authorization: =Bearer {{$env.API_KEY}}
```

This applies to:

- `/api/n8n/*`
- `/api/logs`
- `/api/cobranza/cliente/:rfc/pdf`
- `/api/cobranza/cliente/:rfc/send-statement`

This does not apply to:

- Telegram API URLs.
- Gemini/provider URLs.
- Evolution API URLs.
- `/api/webhooks/evolution`, which uses `X-Webhook-Secret`.
- `/api/cobranza/media/:token`, which is an ephemeral public file URL.

## Backend Curl Equivalents

PowerShell setup:

```powershell
$env:COLLECTA_API_URL = "http://localhost:3001"
$env:API_KEY = "replace-with-test-api-key"
```

Health stays lightweight:

```powershell
curl.exe "$env:COLLECTA_API_URL/api/health"
```

Protected readiness, when implemented by parent:

```powershell
curl.exe "$env:COLLECTA_API_URL/api/diagnostics/e2e-readiness" `
  -H "Authorization: Bearer $env:API_KEY"
```

Daily report:

```powershell
curl.exe "$env:COLLECTA_API_URL/api/n8n/daily-report" `
  -H "Authorization: Bearer $env:API_KEY"
```

Pending collections:

```powershell
curl.exe "$env:COLLECTA_API_URL/api/n8n/pending-collections" `
  -H "Authorization: Bearer $env:API_KEY"
```

Create workflow log:

```powershell
curl.exe -X POST "$env:COLLECTA_API_URL/api/logs" `
  -H "Authorization: Bearer $env:API_KEY" `
  -H "Content-Type: application/json" `
  -d "{\"tipo\":\"N8N_SMOKE_TEST\",\"resultado\":\"ENVIADO\",\"mensaje\":\"Smoke test n8n\",\"modo\":\"PRUEBA\"}"
```

Payment detection:

```powershell
curl.exe -X POST "$env:COLLECTA_API_URL/api/n8n/payment-detections" `
  -H "Authorization: Bearer $env:API_KEY" `
  -H "Content-Type: application/json" `
  -d "{\"rfc\":\"E2EA010101AA1\",\"monto\":2100,\"fechaPago\":\"2026-05-06\",\"referencia\":\"E2E-REF-001\",\"provider\":\"manual-test\"}"
```

Payment review queue:

```powershell
curl.exe "$env:COLLECTA_API_URL/api/n8n/payment-review" `
  -H "Authorization: Bearer $env:API_KEY"
```

Manual payment review confirm:

```powershell
curl.exe -X POST "$env:COLLECTA_API_URL/api/n8n/payment-review/confirm" `
  -H "Authorization: Bearer $env:API_KEY" `
  -H "Content-Type: application/json" `
  -d "{\"operationId\":\"replace-with-test-operation-id\",\"paymentDate\":\"2026-05-06\",\"reference\":\"E2E-REF-001\"}"
```

Send statement by client:

```powershell
curl.exe -X POST "$env:COLLECTA_API_URL/api/cobranza/cliente/E2EA010101AA1/send-statement" `
  -H "Authorization: Bearer $env:API_KEY" `
  -H "Content-Type: application/json" `
  -d "{\"channelPreference\":\"AUTO\"}"
```

Generate PDF fallback:

```powershell
curl.exe "$env:COLLECTA_API_URL/api/cobranza/cliente/E2EA010101AA1/pdf" `
  -H "Authorization: Bearer $env:API_KEY" `
  --output estado_cuenta_e2e.pdf
```

Evolution webhook contract:

```powershell
curl.exe -X POST "$env:COLLECTA_API_URL/api/webhooks/evolution" `
  -H "X-Webhook-Secret: replace-with-test-webhook-secret" `
  -H "Content-Type: application/json" `
  -d "{\"event\":\"messages.upsert\",\"data\":{}}"
```

## Workflow 01: Daily Portfolio Report

Manual steps:

1. Import `n8n/workflows/01_reporte_diario_cartera.json`.
2. Confirm `COLLECTA_API_URL`, `API_KEY`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID` are set to test values.
3. Open the node that calls `/api/n8n/daily-report`.
4. Confirm `Send Headers` is enabled and `Authorization` is `=Bearer {{$env.API_KEY}}`.
5. Run the Collecta HTTP node alone first.
6. If Telegram test chat is configured, run the whole workflow manually.
7. Confirm `POST /api/logs` runs with Bearer auth.

Expected result:

- Missing or wrong Bearer returns 401.
- Correct Bearer returns report JSON.
- Telegram send uses Telegram token only.
- Log node creates a report audit entry.

## Workflow 02: Automatic WhatsApp Collections

Manual steps:

1. Import `n8n/workflows/02_cobranza_automatica_whatsapp.json`.
2. Confirm `/api/n8n/pending-collections` uses Bearer auth.
3. Confirm `/api/logs` nodes use Bearer auth.
4. Confirm Evolution node uses `apikey: {{$env.EVOLUTION_API_KEY}}`, not Collecta Bearer.
5. Run only the pending collections node first.
6. Use test phone numbers only.
7. If Evolution is not configured, do not run a real send node; validate backend fallback through `/api/whatsapp/send` separately if needed.

Expected result:

- Pending collections returns only actionable unpaid/unarchived/unexcluded operations.
- No-phone path creates an error log.
- Evolution node is optional for local verification.

## Workflow 03: Payment Detection With Vision Provider

Manual steps:

1. Import `n8n/workflows/03_deteccion_pagos_gemini_vision.json`.
2. Confirm webhook path is `collecta-payment-proof`.
3. Confirm provider key stays in environment.
4. Confirm `POST /api/n8n/payment-detections` uses Bearer auth.
5. Test Collecta endpoint directly with synthetic payment evidence before calling provider nodes.
6. Use synthetic images/text only if testing provider extraction.

Expected result:

- Valid payment evidence either matches an operation or creates a review-required path.
- No sensitive documents are sent to external providers during Worker B verification.
- Telegram notification is optional and external.

## Workflow 04: Integrated Statement Delivery

Manual steps:

1. Import `n8n/workflows/04_cobranza_email_pdf.json`.
2. Confirm pending collections node uses Bearer auth.
3. Confirm `Enviar estado de cuenta` calls `/api/cobranza/cliente/{{ $json.clienteRfc }}/send-statement`.
4. Confirm that node sends `{"channelPreference":"AUTO"}`.
5. Confirm the disabled manual PDF fallback calls `/api/cobranza/cliente/{{ $json.clienteRfc }}/pdf` with Bearer auth.
6. Run pending collections first.
7. Run statement delivery only against synthetic clients.

Expected result:

- With external services absent, backend should return a controlled delivery result or fallback outcome.
- With test Evolution/email configured, delivery may use those channels.
- Temporary PDF URLs are treated as ephemeral signed-style URLs and are not protected by Bearer.

## Evidence To Capture

For parent final verification, capture:

- Backend URL and environment name.
- n8n workflow import timestamp.
- Workflow run id for each manual run.
- HTTP status for each Collecta node.
- Confirmation that no real customer phone/email/data was used.
- Screenshot or exported execution data showing success/error path.
- Relevant `LogEntry` rows for report, send, payment detection, and manual review.
