# Cobranza E2E Manual Test Script

Scope: manual full-flow verification for parent/owner after Worker B documentation and n8n integrity checks. Use test/staging services and synthetic data only.

Important guardrails:

- Do not use real customer phone numbers, emails, RFCs, documents, or payment receipts.
- Do not paste real secrets into docs, workflow JSON, terminal history shared in reports, or screenshots.
- Do not send real WhatsApp, email, Telegram, or provider requests unless the user explicitly chooses a test account.
- `/api/health` is lightweight. Use protected `/api/diagnostics/e2e-readiness` for readiness only when parent has implemented/verified it.
- Backend diagnostics must not be used as proof that frontend routes rendered. Frontend route checks are manual/browser/build checks.

## 1. Prepare Environment

From repo root:

```powershell
cd "C:\Users\LENOVO\Documents\New project"
git status --short
```

Confirm any unrelated dirty files belong to other workers and are not part of this manual test.

Start test database if needed:

```powershell
docker compose -f docker-compose.test.yml up -d
```

Backend environment:

```powershell
cd "C:\Users\LENOVO\Documents\New project\backend"
$env:API_KEY = "replace-with-test-api-key"
$env:JWT_SECRET = "replace-with-test-jwt-secret-at-least-32-chars"
$env:ADMIN_USER = "admin"
$env:ADMIN_PASS = "replace-with-test-admin-password"
```

Do not overwrite `.env` files for this test.

## 2. Start Backend

```powershell
cd "C:\Users\LENOVO\Documents\New project\backend"
npm run dev
```

Expected:

- Backend starts on `http://localhost:3001` unless another port is configured.
- No secret values are printed in logs.

Health check:

```powershell
curl.exe "http://localhost:3001/api/health"
```

Expected:

- Response includes `status` and `timestamp`.
- It does not include secrets.
- It remains lightweight and does not claim full E2E readiness.

Protected readiness check, when parent implementation exists:

```powershell
curl.exe "http://localhost:3001/api/diagnostics/e2e-readiness" `
  -H "Authorization: Bearer $env:API_KEY"
```

Expected:

- Without auth: 401.
- With auth: backend/service readiness checklist only.
- If route is not present in this branch, record as pending parent verification.

## 3. Start Frontend

In a second terminal:

```powershell
cd "C:\Users\LENOVO\Documents\New project\frontend"
npm run dev
```

Open the Vite URL shown by the terminal, usually:

```text
http://localhost:5173/
```

Expected:

- Login screen renders if not authenticated.
- After login, app shell routes are reachable.

## 4. Login

Use test credentials configured for the environment.

API smoke equivalent:

```powershell
curl.exe -X POST "http://localhost:3001/api/auth/login" `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"$env:ADMIN_USER\",\"password\":\"$env:ADMIN_PASS\"}"
```

Expected:

- 200 with token/user for valid test credentials.
- No secrets are displayed beyond the test token in the local terminal.

## 5. Create Or Import Synthetic Data

Preferred manual path:

1. Use the UI to create or import synthetic clients/operations.
2. Use RFCs with a clear test prefix such as `E2E`.
3. Create at least:
   - One vencida unpaid operation.
   - One operation due today.
   - One operation due within five days.
   - One paid operation.
   - One excluded operation.
   - One archived operation.
4. Use `example.test` emails and non-real phone numbers.

API helper path, if faster:

```powershell
curl.exe -X POST "http://localhost:3001/api/clients" `
  -H "Authorization: Bearer $env:API_KEY" `
  -H "Content-Type: application/json" `
  -d "{\"rfc\":\"E2EA010101AA1\",\"nombre\":\"Cliente E2E Vencido\",\"telefono\":\"6641234567\",\"email\":\"vencido@example.test\"}"
```

Then create operations through UI or API using the created client id.

Plan 04 note:

- This step uses existing ingestion/client/operation behavior as a setup path only.
- Do not expand Smart Import scope or dependencies during this E2E connectivity check.

## 6. Verify Dashboard And Records

Frontend:

- Open `/`.
- Open `/registros`.
- Open `/directorio`.

Expected:

- Synthetic clients appear in directory.
- Synthetic operations appear in records.
- Dashboard/records classify paid, excluded, archived, vencida, hoy vence, and por vencer consistently.

Backend equivalent:

```powershell
curl.exe "http://localhost:3001/api/operations" `
  -H "Authorization: Bearer $env:API_KEY"
```

## 7. Verify Pending Collections

```powershell
curl.exe "http://localhost:3001/api/n8n/pending-collections" `
  -H "Authorization: Bearer $env:API_KEY"
```

Expected:

- Includes vencida, hoy vence, and por vencer active unpaid operations.
- Excludes paid, archived, and excluded operations.
- Includes `clienteRfc`, `clienteTelefono`, `clienteEmail`, `monto`, `status`, `mensajeWhatsApp`, and `waUrl` where applicable.

Missing auth check:

```powershell
curl.exe "http://localhost:3001/api/n8n/pending-collections"
```

Expected:

- 401.

## 8. Verify Agent Planning And Approval

Frontend:

- Open `/agente`.
- Start execution.
- Review pending actions.
- Approve one action.

Backend route contract:

```powershell
curl.exe -X POST "http://localhost:3001/api/agent/execution/start" `
  -H "Authorization: Bearer $env:API_KEY"
```

Pending actions:

```powershell
curl.exe "http://localhost:3001/api/agent/actions/pending" `
  -H "Authorization: Bearer $env:API_KEY"
```

Approve one action:

```powershell
curl.exe -X POST "http://localhost:3001/api/agent/actions/approve/replace-with-action-id" `
  -H "Authorization: Bearer $env:API_KEY"
```

Expected:

- Start route is exactly `POST /api/agent/execution/start`.
- Approval route is exactly `POST /api/agent/actions/approve/:id`.
- Approval moves the action to the controlled handoff state documented by backend response.
- No direct real send occurs merely because an action was planned.

## 9. Verify WhatsApp Fallback

Status:

```powershell
curl.exe "http://localhost:3001/api/whatsapp/status" `
  -H "Authorization: Bearer $env:API_KEY"
```

Send test text only to synthetic number:

```powershell
curl.exe -X POST "http://localhost:3001/api/whatsapp/send" `
  -H "Authorization: Bearer $env:API_KEY" `
  -H "Content-Type: application/json" `
  -d "{\"phone\":\"6641234567\",\"text\":\"Mensaje E2E de prueba\",\"overrideSuspendedClient\":true}"
```

Expected if Evolution is not configured:

- 503 with `evolution_not_configured`.
- Response includes `fallback: "wa.me"`.
- `WhatsAppMessage` and `LogEntry` record the failed/fallback-safe attempt.

Expected if test Evolution is configured:

- Send succeeds only against the test instance/number.
- Log captures success/failure without secrets.

## 10. Verify Statement PDF/Email Flow

Send statement:

```powershell
curl.exe -X POST "http://localhost:3001/api/cobranza/cliente/E2EA010101AA1/send-statement" `
  -H "Authorization: Bearer $env:API_KEY" `
  -H "Content-Type: application/json" `
  -d "{\"channelPreference\":\"AUTO\"}"
```

Generate PDF fallback:

```powershell
curl.exe "http://localhost:3001/api/cobranza/cliente/E2EA010101AA1/pdf" `
  -H "Authorization: Bearer $env:API_KEY" `
  --output estado_cuenta_e2e.pdf
```

Expected:

- `send-statement` returns a controlled result for WhatsApp, email, or manual fallback.
- PDF route streams a PDF for an existing synthetic RFC.
- Temporary media URLs, if returned, are short-lived and do not require Bearer.

## 11. Simulate Payment Detection

```powershell
curl.exe -X POST "http://localhost:3001/api/n8n/payment-detections" `
  -H "Authorization: Bearer $env:API_KEY" `
  -H "Content-Type: application/json" `
  -d "{\"rfc\":\"E2EA010101AA1\",\"monto\":2100,\"fechaPago\":\"2026-05-06\",\"referencia\":\"E2E-REF-001\",\"provider\":\"manual-test\",\"source\":\"manual-e2e\"}"
```

Expected:

- If confident match: operation becomes `PAGADO` and `fechaPago` is set.
- If ambiguous: response sets `reviewRequired: true` and logs review-required payload.

## 12. Verify Payment Review

Open frontend:

```text
/pagos/revision
```

Backend queue:

```powershell
curl.exe "http://localhost:3001/api/n8n/payment-review" `
  -H "Authorization: Bearer $env:API_KEY"
```

Manual confirm if needed:

```powershell
curl.exe -X POST "http://localhost:3001/api/n8n/payment-review/confirm" `
  -H "Authorization: Bearer $env:API_KEY" `
  -H "Content-Type: application/json" `
  -d "{\"operationId\":\"replace-with-test-operation-id\",\"paymentDate\":\"2026-05-06\",\"reference\":\"E2E-REF-001\"}"
```

Expected:

- Review queue shows ambiguous detections.
- Manual confirmation marks operation paid.
- Logs include manual confirmation event.

## 13. Verify Logs

Open frontend:

```text
/logs
```

Backend:

```powershell
curl.exe "http://localhost:3001/api/logs" `
  -H "Authorization: Bearer $env:API_KEY"
```

Expected:

- Entries exist for n8n smoke/logs, WhatsApp attempts, statement delivery where applicable, payment detection, and manual review.
- No secrets are present in log messages.

## 14. Validate n8n Workflows

Run automated integrity test:

```powershell
cd "C:\Users\LENOVO\Documents\New project\backend"
npx vitest run src/__tests__/n8nWorkflowsIntegrity.test.ts
```

Then import and manually run workflows following:

```text
docs/reports/N8N_E2E_CONNECTIVITY_CHECKLIST.md
```

Expected:

- JSON import succeeds.
- Collecta nodes use Bearer where required.
- External nodes keep their own auth contracts.
- Workflow 04 uses `send-statement`.

## 15. Record Results

Update the parent final connectivity report with:

- Backend URL.
- Frontend URL.
- DB/test environment.
- n8n workflow run ids.
- External services configured/not configured.
- Manual screenshots or curl status evidence.
- Known gaps and risks.
- Confirmation that no real customer data or secrets were used.
