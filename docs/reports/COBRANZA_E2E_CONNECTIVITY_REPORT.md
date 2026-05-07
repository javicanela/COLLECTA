# Cobranza E2E Connectivity Report

Draft owner: Plan 04 Worker B.

This is a draft report for documentation and n8n workflow integrity. Full E2E service, frontend route, browser, and external-provider verification remains pending parent verification.

## Date

2026-05-06 workspace-local context.

## Environment

| Item | Value |
|---|---|
| Repo | `C:\Users\LENOVO\Documents\New project` |
| Backend | Express 5, TypeScript, Prisma |
| Frontend | React 19, TypeScript, Vite, TailwindCSS |
| DB target | PostgreSQL/Neon |
| Automation | n8n workflow exports under `n8n/workflows` |
| Worker B scope | Documentation plus `backend/src/__tests__/n8nWorkflowsIntegrity.test.ts` |

## Services

| Service | Status | Evidence | Notes |
|---|---|---|---|
| Backend route map | Documented by Worker B | `docs/reports/COBRANZA_E2E_CONTRACT_MAP.md` | Routes were mapped from current backend source. |
| `/api/health` | Existing lightweight health | `backend/src/index.ts` has public `GET /api/health` | Kept as lightweight health; not expanded into readiness. |
| `/api/diagnostics/e2e-readiness` | Pending parent verification | Documented as protected readiness target | Worker B did not edit backend app code. |
| n8n workflow JSON exports | Verified by Worker B automated test | `npx vitest run src/__tests__/n8nWorkflowsIntegrity.test.ts` passed once during Worker B implementation | Final parent may rerun after other workers finish. |
| n8n manual connectivity | Pending parent verification | `docs/reports/N8N_E2E_CONNECTIVITY_CHECKLIST.md` | Requires n8n runtime/env and optional external services. |
| Frontend route rendering | Pending parent manual/build verification | `docs/reports/COBRANZA_E2E_MANUAL_TEST_SCRIPT.md` | Backend diagnostics must not claim frontend routes render. |
| Evolution API | Pending parent configuration check | Manual script includes `/api/whatsapp/status` and fallback send check | Optional self-host path; `wa.me` fallback expected when absent. |
| Email/PDF statement delivery | Pending parent verification | Workflow 04 and contract map reference `send-statement` | Backend route exists; external email config may be absent. |
| Payment detection/review | Pending parent E2E verification | Manual script includes payment detection and review confirm curls | Automated full DB flow is outside Worker B ownership. |

## Automated Tests

| Command | Worker B result | Notes |
|---|---|---|
| `npx vitest run src/__tests__/n8nWorkflowsIntegrity.test.ts` from `backend` | Passed during Worker B implementation | Parses 4 workflows, scans for hardcoded secrets, checks Bearer auth on protected Collecta routes, and verifies workflow 04 `send-statement` when backend route exists. |

## Manual Test Results

Pending parent verification.

Manual script prepared at:

```text
docs/reports/COBRANZA_E2E_MANUAL_TEST_SCRIPT.md
```

Parent should record:

- Backend start result and port.
- Frontend start result and port.
- Login result.
- Synthetic data creation/import result.
- Pending collections response.
- Agent start and approve route results using real routes:
  - `POST /api/agent/execution/start`
  - `POST /api/agent/actions/approve/:id`
- WhatsApp fallback or test Evolution result.
- Statement delivery/PDF result.
- Payment detection and review result.
- Logs evidence.

## Open Windows / URLs For User Testing

Pending parent verification.

Suggested URLs once services are running:

| Target | URL |
|---|---|
| Frontend | `http://localhost:5173/` or Vite-assigned port |
| Dashboard | `http://localhost:5173/` |
| Agent | `http://localhost:5173/agente` |
| Payment review | `http://localhost:5173/pagos/revision` |
| Logs | `http://localhost:5173/logs` |
| Backend health | `http://localhost:3001/api/health` |
| Protected readiness | `http://localhost:3001/api/diagnostics/e2e-readiness` when parent has route available |

## Known Gaps

| Gap | Status | Mitigation |
|---|---|---|
| Full backend E2E DB test was not part of Worker B write set. | Pending parent verification | Use manual script and parent-owned tests. |
| Readiness route was documented but not implemented by Worker B. | Pending parent verification | Keep `/api/health` lightweight; implement/read protected readiness separately if assigned. |
| Frontend rendering was not tested by Worker B. | Pending parent verification | Use frontend build/manual browser checks. |
| External n8n runtime was not executed by Worker B. | Pending parent verification | Import workflows and run manual checklist with test env. |
| External providers may be unconfigured. | Expected in local dev | Validate fallback paths and avoid real sends. |
| Smart Import scope is intentionally avoided. | Accepted for Worker B | Treat import as setup only; do not add dependencies here. |

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Other workers may update backend routes or workflow exports after this draft. | Contract map or test expectations may need refresh. | Rerun integrity test and update docs before final parent signoff. |
| n8n environment may use a different backend URL than local curl tests. | Workflows may pass local checks but fail in n8n runtime. | Verify `COLLECTA_API_URL` from n8n host/container network. |
| External services may accidentally point to real accounts. | Could send real messages/emails or leak data. | Use test credentials only; disable send nodes until verified. |
| Temporary PDF URLs are public by token. | Links must not be shared beyond test context. | Confirm TTL and random token behavior in parent verification. |

## Next Actions

1. Parent reruns Worker B n8n integrity test after all Plan 04 workers finish.
2. Parent starts backend/frontend in test environment and follows manual script.
3. Parent imports n8n workflows and runs checklist against test backend.
4. Parent updates this draft with concrete evidence, ports, run ids, screenshots, and final connectivity status.
5. Parent confirms no real secrets, customer data, or external production sends were used.
