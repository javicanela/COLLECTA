# Cobranza E2E Connectivity Report

## Date

2026-05-08 workspace-local verification.

## Environment

| Item | Value |
|---|---|
| Repo | `C:\Users\LENOVO\Documents\New project` |
| Branch | `chore/repo-cleanup-and-definitive-plan` |
| Backend | Express 5, TypeScript, Prisma |
| Frontend | React 19, TypeScript, Vite |
| DB target | Safe local/test PostgreSQL via `backend/.env.test` |
| Automation | n8n workflow exports under `n8n/workflows` |

## Services

| Service | Status | Evidence | Notes |
|---|---|---|---|
| Backend build | Pass | `cd backend && npm run build` | TypeScript compiled successfully. |
| Frontend build | Pass | `cd frontend && npm run build` | Build passed with existing large chunk warnings from Vite. |
| Smart Import tests | Pass | `cd frontend && npm test -- src/features/smart-import` | 24 files / 82 tests passed. |
| Frontend audit | Pass | `cd frontend && npm audit --omit=dev` | 0 vulnerabilities. |
| n8n workflow integrity | Pass | `cd backend && npx vitest run --config vitest.config.ts src/__tests__/n8nWorkflowsIntegrity.test.ts` | 4 tests passed; validates parseable JSON, auth headers, no hardcoded secrets. |
| Protected diagnostics unit test | Pass without DB | `cd backend && npx vitest run --config vitest.config.ts src/__tests__/diagnostics.test.ts` | 4 tests passed; validates auth, shape, no secret leakage, optional integration warnings. |
| Full DB-backed backend E2E | Pass | `cd backend && npm run test:full -- src/__tests__/diagnostics.test.ts src/__tests__/collectionsE2E.pendingCollections.test.ts src/__tests__/collectionsE2E.agentActions.test.ts src/__tests__/collectionsE2E.statementDeliveryFallback.test.ts src/__tests__/collectionsE2E.paymentDetection.test.ts src/__tests__/collectionsE2E.logs.test.ts src/__tests__/n8nWorkflowsIntegrity.test.ts` | 7 files / 13 tests passed after starting Docker Desktop and preparing test DB. |
| Test DB preparation UX | Improved and verified | `backend/scripts/ensure-test-db.js`, `npm run test:prepare` | Safe DB guard, Docker startup attempt, actionable error if Docker is unavailable; successfully started `collecta-test-postgres` and applied Prisma schema. |

## Automated Tests

| Command | Result | Notes |
|---|---|---|
| `cd backend && npm run build` | Pass | Fresh run. |
| `cd backend && npx vitest run --config vitest.config.ts src/__tests__/diagnostics.test.ts src/__tests__/n8nWorkflowsIntegrity.test.ts` | Pass | 2 files / 8 tests passed. |
| `cd frontend && npm test -- src/features/smart-import` | Pass | 24 files / 82 tests passed. |
| `cd frontend && npm run build` | Pass | Vite emitted chunk-size warning only. |
| `cd frontend && npm audit --omit=dev` | Pass | 0 vulnerabilities. |
| `cd backend && npm run test:full -- ...Plan04 tests...` | Pass | 7 files / 13 tests passed against `collecta_test`. |

## Manual Test Results

Manual browser route verification remains pending. Backend DB-backed automated
verification is now unblocked and passing with the local Docker PostgreSQL test
service.

Use:

```powershell
cd "C:\Users\LENOVO\Documents\New project\backend"
npm run test:prepare
npm run test:full -- src/__tests__/diagnostics.test.ts src/__tests__/collectionsE2E.pendingCollections.test.ts src/__tests__/collectionsE2E.agentActions.test.ts src/__tests__/collectionsE2E.statementDeliveryFallback.test.ts src/__tests__/collectionsE2E.paymentDetection.test.ts src/__tests__/collectionsE2E.logs.test.ts src/__tests__/n8nWorkflowsIntegrity.test.ts
```

Then follow `docs/reports/COBRANZA_E2E_MANUAL_TEST_SCRIPT.md` for browser and
operator-flow checks.

## Open Windows / URLs For User Testing

No backend/frontend dev servers were left open during automated verification.
The local test DB container `collecta-test-postgres` is running for follow-up
manual checks. Start services when ready:

| Target | URL |
|---|---|
| Frontend | `http://localhost:5173/` or Vite-assigned port |
| Dashboard | `http://localhost:5173/` |
| Agent | `http://localhost:5173/agente` |
| Payment review | `http://localhost:5173/pagos/revision` |
| Logs | `http://localhost:5173/logs` |
| System diagnostics | `http://localhost:5173/sistema/diagnostico` |
| Backend health | `http://localhost:3001/api/health` |
| Protected readiness | `http://localhost:3001/api/diagnostics/e2e-readiness` |

## Known Gaps

| Gap | Status | Mitigation |
|---|---|---|
| Browser/manual route rendering has not been captured in this report. | UI routes still need visual/operator signoff. | Start backend/frontend and follow the manual script. |
| External WhatsApp/email/payment providers may be unconfigured. | Expected in local dev. | Diagnostics warns and statement delivery/WhatsApp routes keep fallback behavior. |
| Backend diagnostics cannot prove frontend route rendering. | By design. | Use frontend build plus manual browser checks. |
| n8n runtime was not executed. | Workflow JSON integrity verified only. | Import workflows into n8n test runtime and run checklist with test env. |

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Running tests against a non-test DB. | Could mutate real data. | `assertSafeTestDatabase()` guards fixture seeding; `ensure-test-db.js` refuses unsafe `DATABASE_URL` markers. |
| Optional provider env points to real accounts. | Could send real messages/emails. | Keep test env blank or use isolated test accounts only. |
| Large frontend chunks from PDF/OCR dependencies. | Slower first load. | Existing warning documented; Plan 05 can improve code-splitting if it touches UI architecture. |

## Next Actions

1. Start backend/frontend and execute the manual test script.
2. Use `/sistema/diagnostico` for protected readiness and `/api/health` only for lightweight health.
3. Proceed to Plan 05 UI-first implementation on top of the verified routes/contracts.
