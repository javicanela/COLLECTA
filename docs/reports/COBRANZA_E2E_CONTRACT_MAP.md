# Cobranza E2E Contract Map

Scope: Plan 04 Worker B documentation and n8n workflow integrity only.

Non-goals for this Worker B pass:

- No frontend or backend app code changes.
- No package, dependency, Prisma schema, or environment changes.
- No Smart Import implementation or dependency work. Import routes are mapped only as existing ingestion contracts.
- No claim that backend diagnostics can prove frontend routes render; frontend checks belong in build/manual verification.

Source files reviewed:

- `backend/prisma/schema.prisma`
- `backend/src/index.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/routes/auth.ts`
- `backend/src/routes/clients.ts`
- `backend/src/routes/operations.ts`
- `backend/src/routes/import.ts`
- `backend/src/routes/n8n.ts`
- `backend/src/routes/agent.ts`
- `backend/src/routes/whatsapp.ts`
- `backend/src/routes/webhooks.ts`
- `backend/src/routes/cobranza.ts`
- `frontend/src/App.tsx`
- `n8n/README.md`
- `n8n/workflows/01_reporte_diario_cartera.json`
- `n8n/workflows/02_cobranza_automatica_whatsapp.json`
- `n8n/workflows/03_deteccion_pagos_gemini_vision.json`
- `n8n/workflows/04_cobranza_email_pdf.json`

## Actors

| Actor | Role in flow | Auth or trust boundary |
|---|---|---|
| Operator/admin | Logs in, imports or creates data, reviews dashboard, starts agent, approves actions, reviews payments and logs. | Frontend login, then Bearer JWT/API token against protected backend routes. |
| Backend API | Owns data contracts, auth, cobranza state, payment detection, WhatsApp/PDF/email handoff, and logs. | Express routes; `requireAuth` protects app, n8n, agent, WhatsApp, logs, import, and protected cobranza routes. |
| Prisma/PostgreSQL/Neon | Stores clients, operations, config, logs, WhatsApp messages, agent executions/actions. | Backend only. |
| n8n | Scheduled/manual automation runner for reports, cobranza sends, payment evidence processing, and integrated statement flow. | Uses `Authorization: Bearer {{$env.API_KEY}}` for protected Collecta routes. |
| Evolution API | Optional self-hosted WhatsApp transport. | External service contract with its own API key; not protected by Collecta Bearer auth. |
| Email provider | Optional statement delivery channel. | External service config, no automated test sends in Plan 04 Worker B. |
| Telegram | Optional notification channel in n8n workflows. | External bot token; not protected by Collecta Bearer auth. |
| Gemini or equivalent provider | Optional OCR/vision analysis for payment evidence workflow. | External provider key; provider-agnostic from Collecta product perspective. |

## Data Objects

| Object | Source | Key fields | E2E role |
|---|---|---|---|
| `User` | Prisma | `id`, `name`, `email`, `role` | Auth/admin identity. |
| `Client` | Prisma | `rfc`, `nombre`, `telefono`, `email`, `estado`, `asesor` | Debtor/customer record used by cobranza and statement delivery. |
| `Operation` | Prisma | `clientId`, `tipo`, `descripcion`, `monto`, `fechaVence`, `fechaPago`, `estatus`, `excluir`, `archived` | Receivable item classified as vencido, hoy vence, por vencer, pagado, excluido, or archivado. |
| `LogEntry` | Prisma | `tipo`, `variante`, `resultado`, `mensaje`, `telefono`, `modo`, `clientId` | Audit trail for reports, WhatsApp, payment detection, and manual confirmations. |
| `WhatsAppMessage` | Prisma | `operationId`, `clientId`, `direction`, `messageType`, `phone`, `content`, `mediaUrl`, `status` | Outbound WhatsApp/media attempt tracking. |
| `AgentExecution` | Prisma | `status`, `phase`, `progress`, `triggeredBy`, counters | Agent lifecycle and planning batch. |
| `AgentAction` | Prisma | `executionId`, `clientId`, `type`, `status`, `message`, `phone` | Action requiring controlled approval/handoff. |
| `AgentConfig` | Prisma | `scheduleEnabled`, `scheduleCron`, `maxDailySends`, `sendPdfEnabled` | Agent limits and behavior flags. |
| `Config` | Prisma | `key`, `value` | Templates and office/payment settings. |
| Temporary PDF token | Backend temp storage | random token, content type, expiry | Public ephemeral media URL for Evolution/API downloads; not a permanent public asset. |

## Backend Routes

| Step | Route | Method | Auth | Input | Output | Status |
|---|---|---|---|---|---|---|
| Login | `/api/auth/login` | POST | Public credentials | `{ email, password }` | `{ token, user }` | Existing in code. |
| Verify auth | `/api/auth/verify` | POST | Bearer token | `Authorization` header | `{ valid, user }` or auth error | Existing in code. |
| List/create clients | `/api/clients` | GET/POST | Bearer | Client filters or client payload | Client list or created client | Existing in code. |
| Client detail/update/delete | `/api/clients/:id` | GET/PUT/DELETE | Bearer | Client id and optional update payload | Client or delete confirmation | Existing in code. |
| Lookup client by RFC | `/api/clients/by-rfc/:rfc` | GET | Bearer | RFC path param | Client or 404 | Existing in code. |
| List/create operations | `/api/operations` | GET/POST | Bearer | Filters or operation payload | Operation list or created operation | Existing in code. |
| Update operation | `/api/operations/:id` | PUT | Bearer | Operation update payload | Updated operation | Existing in code. |
| Operation payment/archive toggles | `/api/operations/:id/pay`, `/unpay`, `/archive`, `/unarchive`, `/toggle-exclude` | PATCH | Bearer | Operation id | Updated operation | Existing in code. |
| Operation summary | `/api/operations/stats/summary` | GET | Bearer | none | Summary counts and amount | Existing in code. |
| Client operation history | `/api/operations/cliente/:rfc/historial` | GET | Bearer | RFC, optional `meses` | Operation history | Existing in code. |
| Import analyze | `/api/import/analyze` | POST | Bearer | Smart Import analysis payload | Mapping/analysis result | Existing; mapped for ingestion context only. Plan 04 Worker B does not depend on Smart Import. |
| Import commit | `/api/import/commit` | POST | Bearer | Approved rows/mapping | Commit result | Existing; mapped for ingestion context only. Plan 04 Worker B does not modify it. |
| Legacy import batch | `/api/import/batch` | POST | Bearer | `{ headers, rows, provider }` | Import result | Existing in code; avoid new dependency work in Plan 04. |
| Daily report for n8n | `/api/n8n/daily-report` | GET | Bearer API key/JWT | none | Summary, top debtors, urgent operations, formatted message | Existing in code and workflow 01. |
| Pending collections | `/api/n8n/pending-collections` | GET | Bearer API key/JWT | none | `{ total, collections }` for vencidas/hoy/por vencer | Existing in code and workflows 02/04. |
| Payment confirmed webhook | `/api/n8n/webhook/payment-confirmed` | POST | Bearer API key/JWT | Payment evidence | Match/review response | Existing in code. |
| Payment detections | `/api/n8n/payment-detections` | POST | Bearer API key/JWT | `{ rfc, monto/amount, fechaPago/paymentDate, referencia/reference, provider, source, rawText, mediaUrl }` | `{ matched, reviewRequired, status, message, operationId }` | Existing in code and workflow 03. |
| Payment review queue | `/api/n8n/payment-review` | GET | Bearer API key/JWT | none | `{ total, pending }` | Existing in code. |
| Payment review confirm | `/api/n8n/payment-review/confirm` | POST | Bearer API key/JWT | `{ operationId, paymentDate?, reference?, receiptId? }` | Manual confirmation result and operation | Existing in code. |
| Logs list/create | `/api/logs` | GET/POST | Bearer | none or log payload | Log list or created log | Existing in code and workflows 01/02. |
| Agent dashboard | `/api/agent/dashboard` | GET | Bearer | none | Agent dashboard payload | Existing in code. |
| Agent execution start | `/api/agent/execution/start` | POST | Bearer | none | 201 execution and planned action summary, or 409 active execution | Existing in code. |
| Agent execution status/history/detail | `/api/agent/execution/status`, `/history`, `/:id` | GET | Bearer | optional execution id | Status/history/detail | Existing in code. |
| Agent execution controls | `/api/agent/execution/stop`, `/pause`, `/resume` | POST | Bearer | none | Updated execution state | Existing in code. |
| Agent pending actions | `/api/agent/actions/pending` | GET | Bearer | none | Pending action list | Existing in code. |
| Agent approve action | `/api/agent/actions/approve/:id` | POST | Bearer | Action id | Approved action handoff state | Existing in code. |
| Agent cancel action | `/api/agent/actions/cancel/:id`, `/cancel-all` | POST | Bearer | Action id or none | Cancel confirmation | Existing in code. |
| WhatsApp status | `/api/whatsapp/status` | GET | Bearer | none | Configured/connected state | Existing in code. |
| WhatsApp text send | `/api/whatsapp/send` | POST | Bearer | `{ phone, text, clientId?, operationId? }` | Send result or `wa.me` fallback | Existing in code. |
| WhatsApp media send | `/api/whatsapp/send-media` | POST | Bearer | `{ phone, mediaUrl, caption?, mediaType?, fileName?, clientId?, operationId? }` | Send result or `wa.me` fallback | Existing in code. |
| Generate statement PDF | `/api/cobranza/cliente/:rfc/pdf` | GET | Bearer | RFC | PDF stream | Existing in code and workflow 04 disabled fallback. |
| Send statement by client | `/api/cobranza/cliente/:rfc/send-statement` | POST | Bearer | `{ channelPreference: "WHATSAPP"|"EMAIL"|"AUTO" }` | Statement delivery result | Existing in code and workflow 04. |
| Send statement by operation | `/api/cobranza/operation/:operationId/send-statement` | POST | Bearer | `{ channelPreference? }` | Statement delivery result | Existing in code. |
| Temporary PDF media | `/api/cobranza/media/:token` | GET | Public ephemeral token | token path param | PDF file or 404/410 | Existing in code; intentionally no Bearer so external media clients can fetch short-lived files. |
| Evolution webhook | `/api/webhooks/evolution` | POST | `X-Webhook-Secret` | Evolution event payload | Webhook result | Existing in code; not Bearer auth. |
| Health | `/api/health` | GET | Public | none | Lightweight status/timestamp with DB ping | Existing in code; should stay lightweight. |
| E2E readiness | `/api/diagnostics/e2e-readiness` | GET | Bearer | none | Readiness checklist | Protected diagnostic target pending parent implementation/verification. It must not claim frontend routes render. |

## n8n Workflows

| Workflow | Trigger | Collecta routes | Required Collecta auth | External services | Notes |
|---|---|---|---|---|---|
| `01_reporte_diario_cartera.json` | Schedule 8:00 | `GET /api/n8n/daily-report`, `POST /api/logs` | `Authorization: Bearer {{$env.API_KEY}}` | Telegram | Sends report notification and writes audit log. |
| `02_cobranza_automatica_whatsapp.json` | Schedule 9:30 | `GET /api/n8n/pending-collections`, `POST /api/logs` | `Authorization: Bearer {{$env.API_KEY}}` | Evolution API, Telegram | Sends text WhatsApp through Evolution when configured; logs no-phone and send outcomes. |
| `03_deteccion_pagos_gemini_vision.json` | n8n webhook | `POST /api/n8n/payment-detections` | `Authorization: Bearer {{$env.API_KEY}}` | Gemini, Telegram | Optional payment evidence analysis. Gemini is replaceable/provider-agnostic from Collecta perspective. |
| `04_cobranza_email_pdf.json` | Schedule 10:00 | `GET /api/n8n/pending-collections`, `POST /api/cobranza/cliente/:rfc/send-statement`; disabled fallback `GET /api/cobranza/cliente/:rfc/pdf` | `Authorization: Bearer {{$env.API_KEY}}` | Statement delivery internals: WhatsApp/email/fallback | References `send-statement` route because backend route exists. |

## Frontend Views

Frontend routes observed in `frontend/src/App.tsx`:

| Route | View | E2E role | Verification owner |
|---|---|---|---|
| `/` | `DashboardView` | Overall cobranza status and summary. | Frontend build/manual browser check. |
| `/directorio` | `DirectoryView` | Client directory. | Frontend build/manual browser check. |
| `/registros` | `RegistersView` | Operation records. | Frontend build/manual browser check. |
| `/exportar` | `ExportView` | Export workflows. | Frontend build/manual browser check. |
| `/agente` | `AgentView` | Agent lifecycle and approvals. | Frontend build/manual browser check. |
| `/pagos/revision` | `PaymentReviewView` | Manual payment review. | Frontend build/manual browser check. |
| `/config` | `ConfigView` | Templates and operating config. | Frontend build/manual browser check. |
| `/logs` | `LogView` | Audit log review. | Frontend build/manual browser check. |
| `/ui-preview` | `UIPreview` | Dev-only UI preview. | Dev build only. |

Backend diagnostics should only report backend/service readiness. They should not assert that these frontend routes rendered successfully.

## External Services

| Service | Required for core local verification? | Config variables | Expected fallback or handling |
|---|---:|---|---|
| PostgreSQL/Neon | Yes for full backend E2E | `DATABASE_URL`, `DIRECT_URL` | Backend tests should use test/staging DB only. |
| n8n | No for backend unit/integrity tests; yes for manual workflow execution | `COLLECTA_API_URL`, `API_KEY` plus workflow-specific vars | Workflow JSON can be validated without running n8n. Manual runs need matching backend API key. |
| Evolution API | No | `EVOLUTION_API_URL`, `EVOLUTION_INSTANCE`, `EVOLUTION_API_KEY`, `EVOLUTION_WEBHOOK_SECRET` | Backend returns controlled `evolution_not_configured` with `wa.me` fallback for sends. |
| Telegram | No | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | n8n external node only. Do not apply Collecta Bearer rules to Telegram. |
| Gemini or vision provider | No | `GEMINI_API_KEY` or provider equivalent | Optional workflow 03 path. Do not send sensitive data during Worker B verification. |
| Email/Resend/SMTP | No | `EMAIL_PROVIDER`, `SMTP_*`, `EMAIL_FROM`, `RESEND_API_KEY` | Statement delivery should fall back or report not configured without leaking secrets. |
| Temporary file storage | Local backend service | backend runtime temp path | Short-lived public media URLs are expected for PDF downloads. |

## Known Gaps

| Gap | Impact | Current handling |
|---|---|---|
| Protected readiness route `/api/diagnostics/e2e-readiness` is a Plan 04 target but not verified by Worker B app-code changes. | Full readiness dashboard/report remains pending parent implementation or verification. | Documented as pending parent verification; `/api/health` remains lightweight. |
| Worker B does not run full backend build or browser/manual route rendering. | Connectivity report remains draft for parent to complete. | Manual test script lists exact checks. |
| External services may not be configured locally. | n8n workflows can parse and pass auth integrity while external sends remain untested. | Checklist separates Collecta auth checks from Telegram/Gemini/Evolution contracts. |
| Workflow 03 uses Gemini-specific node URL in export. | This is acceptable for a sample workflow, but Collecta should remain provider-agnostic. | Treat as optional provider path; avoid sending sensitive production data. |
| Import routes are mapped but not expanded in this Plan 04 Worker B pass. | E2E data setup may rely on existing import behavior or direct API creation. | Avoid Smart Import/dependency work here. |

## Test Data Requirements

Use synthetic data only. Recommended shape:

| Requirement | Example |
|---|---|
| RFC prefix | `E2E` or another clearly synthetic prefix. |
| Client names | `Cliente E2E Vencido`, `Cliente E2E Hoy`, `Cliente E2E Sin Contacto`. |
| Phone numbers | Mexican-format test numbers such as `6641234567`; do not use real customer phones. |
| Email addresses | `example.test` domain such as `vencido@example.test`. |
| Operations | At least one vencida, one hoy vence, one por vencer, one pagada, one excluida, one archivada. |
| Payment evidence | Synthetic RFC, amount, reference, and payment date. |
| Secrets | Use environment variables only; never paste real API keys into workflow JSON, docs, curl snippets, or tests. |

Minimum manual dataset goal:

- `GET /api/n8n/pending-collections` returns only vencida/hoy/por vencer unpaid and active operations.
- Agent planning can create pending actions without sending automatically.
- Payment detection can either match confidently or create review-required evidence.
- Logs show report/send/payment events after each step.
