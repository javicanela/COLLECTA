# Phase 8 Monitoring and Incidents

This document tells operators where to look when Collecta fails in production.

## Signals

API health:

- Probe: `GET /api/health`.
- Expected: 200 with `status=ok`.
- Alert: 2 consecutive failures or latency above normal for 5 minutes.
- First checks: Railway logs, database connectivity, `DATABASE_URL`, Neon status.

Failed jobs:

- Source: n8n workflow execution history.
- Watch workflows:
  - `01_reporte_diario_cartera`
  - `02_cobranza_automatica_whatsapp`
  - `03_deteccion_pagos_gemini_vision`
  - `04_cobranza_email_pdf`
- Alert: any failed scheduled run, repeated retry, or auth error.
- First checks: `COLLECTA_API_URL`, `API_KEY`, backend `/api/n8n/*` responses.

Failed WhatsApp sends:

- Source: backend `WhatsAppMessage.status`, `LogEntry.tipo=WHATSAPP`, Railway logs, Evolution API logs.
- Alert: failed send rate above 5 percent in 15 minutes, or any sustained `connection_check_failed`.
- First checks: `/api/whatsapp/status`, Evolution instance state, API key, phone normalization, suspended client blocks.
- Fallback: use generated `wa.me` links for manual sends.

Import failure rates:

- Source: backend logs for `/api/import/batch`, import response fields `errores` and `operacionesOmitidas`.
- Alert: more than 10 percent rows omitted in a batch, or repeated 500 responses.
- First checks: uploaded headers, deterministic mapping result, invalid RFCs, date/money formats, provider fallback source.

Payment detection confidence:

- Source: `LogEntry.tipo=PAYMENT_DETECTION`.
- Important fields in `mensaje`:
  - `fingerprint`
  - `confidence_source`
  - `confidence_reasons`
  - `operationId`
- Alert:
  - any spike in `resultado=REVIEW_REQUIRED`.
  - any `resultado=DUPLICATE` above expected replay volume.
  - accepted payments with only tolerance-based matches require periodic audit.
- First checks: bank evidence, RFC, amount tolerance, duplicate receipt id/reference, target operation status.

## Incident Playbooks

Imports failing:

1. Check Railway logs for `/api/import/batch`.
2. Inspect the import response: `mapping`, `_source`, `errores`, `operacionesOmitidas`.
3. If `_source=regex`, confirm headers match synonyms and values include RFC/monto/concepto.
4. If AI provider was expected, confirm provider API keys and provider health.
5. Re-run a minimal batch with one known valid row before retrying the full import.

WhatsApp failing:

1. Call `/api/whatsapp/status`.
2. If `configured=false`, check backend env vars.
3. If `state=error`, inspect Evolution API logs and Railway logs for the request id.
4. Query recent `WhatsAppMessage` rows with `status=FAILED` or `BLOCKED`.
5. For `BLOCKED`, confirm client `estado`; use explicit override only with operator approval.
6. Use `wa.me` fallback for urgent collections.

n8n failing:

1. Open the failed n8n execution.
2. Identify the failing node and HTTP status.
3. For 401, rotate/check `API_KEY` alignment between n8n and backend.
4. For 5xx, inspect Railway logs around the execution timestamp.
5. For webhook failures, verify `X-Webhook-Secret`.
6. Re-run only after confirming the workflow is idempotent.

Payments failing or low confidence:

1. Check `LogEntry.tipo=PAYMENT_DETECTION` for the evidence fingerprint.
2. If `REVIEW_REQUIRED`, compare RFC and amount against pending operations.
3. If duplicate, confirm the same receipt/reference was already accepted.
4. If accepted by tolerance, spot-check bank evidence before bulk closeout.
5. Never mark additional operations paid from the same receipt without a distinct fingerprint.

## Minimum Dashboards

- API health uptime and latency.
- API 4xx/5xx count by route.
- n8n failed executions by workflow.
- WhatsApp sends by `SENT`, `FAILED`, `BLOCKED`.
- Import rows created/omitted/error rate per batch.
- Payment detection counts by `ACCEPTED`, `REVIEW_REQUIRED`, `DUPLICATE`.
