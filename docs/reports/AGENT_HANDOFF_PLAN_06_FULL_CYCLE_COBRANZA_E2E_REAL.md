# Agent Handoff Plan 06 - Full Cycle Cobranza E2E Real

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:using-git-worktrees` before implementation when available, then use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. This plan is designed for up to 5 parallel agents with strict file ownership.

## Goal

Implement and verify the complete operational cobranza cycle:

1. Upload a disorganized file with 10 clients.
2. Verify Smart Import mapping.
3. Accept/commit the mapping.
4. Confirm clients and operations appear in the UI.
5. Verify operation buttons work.
6. Send individual WhatsApp message and PDF statement.
7. Receive a real or simulated WhatsApp payment confirmation.
8. Correlate the response with the previous outbound collection message.
9. Mark the operation as paid automatically when safe.
10. Produce audit logs and reports visible from the app.

## One Responsibility

This plan owns only the product-critical E2E cobranza workflow. It does not own external auth, sales collateral, pricing, landing pages, deployment platform setup, or installation packaging.

## Accumulated Project Context

This plan must inherit the work already completed in prior phases. Do not restart discovery from zero.

Previous work that matters:

- Plan 02 delivered PDF statement generation, temporary PDF storage, statement delivery, WhatsApp/email/fallback behavior, n8n workflow `04_cobranza_email_pdf.json`, and Railway deployment verification.
- Plan 03 delivered Smart Import as the core differentiator: local-first parsing, deterministic analysis, OCR/multimodal direction, provider-agnostic escalation, challenge logic, preview-before-commit, and support for chaotic files.
- Plan 04 closed the E2E connectivity/readiness foundation. `/api/health` must remain lightweight. External readiness belongs in protected `/api/diagnostics/e2e-readiness`.
- Plan 05 delivered the operational UI shell: sidebar/status rail, cobranza workbench, priority queue, operation inspector, agent control center, payment review, diagnostics, audit timeline, and reusable UI primitives.
- The local DB pain point was addressed through `backend npm run test:prepare`, Docker test Postgres, and safety around test DB setup. Do not regress into manual-only DB setup.
- Wasp plugin knowledge exists as external reference only. Wasp CLI works through WSL Ubuntu, not native Windows. It is not a Collecta runtime dependency.
- The `xlsx` vulnerability has no normal npm fix available in the public package path; the project currently uses the SheetJS CDN tarball. Do not downgrade or replace it casually.

Current verified baseline before this plan was created:

- `frontend npm run build`: passing.
- `frontend npm test`: passing, 43 files / 140 tests.
- `backend npm run build`: passing.
- `backend npm run test:full`: passing, 22 files / 94 tests.
- Browser QA verified local login, cartera, Smart Import route, agente, pagos, diagnostico, logs, and mobile nav.

Known product gap this plan must close:

- The backend can record incoming Evolution messages.
- The backend can detect payment from RFC/amount evidence.
- The missing product link is deterministic correlation: "the same phone number that received a cobranza message replied that payment was made." This must be implemented safely, not faked in UI.

Known behavior expectations:

- Do not implement the minimum just to pass tests. Implement the strongest correction aligned with Collecta's project logic.
- Every meaningful workflow must be documented for future operators.
- Browser QA is part of the definition of done.
- Real WhatsApp testing requires explicit user confirmation immediately before sending.

## Exponential Quality Mandate

Each plan must increase Collecta's functionality, user experience, and operational trust by more than the previous one.

For Plan 06 that means:

- The app stops feeling like separate modules and starts proving a complete business outcome: import, collect, confirm payment, audit.
- The E2E flow must be usable by a real despacho operator, not only by a developer.
- Visual quality must improve through clarity: better states, better action placement, safer disabled reasons, readable audit trail, and fewer ambiguous buttons.
- Automated tests must cover the hard business rules, while browser QA must cover the human workflow.
- Documentation must be good enough that another session can repeat the full test without asking what happened in this conversation.

## Required Branch

Each session implementing this plan must create and work only on:

```powershell
git checkout -b codex/plan06-full-cycle-cobranza-e2e
```

If the branch already exists locally:

```powershell
git checkout codex/plan06-full-cycle-cobranza-e2e
git pull --ff-only
```

If parallel local work is needed, use a worktree:

```powershell
git worktree add .worktrees/plan06-full-cycle-cobranza-e2e -b codex/plan06-full-cycle-cobranza-e2e
```

Before creating `.worktrees`, verify it is ignored. If it is not ignored, add `.worktrees/` to `.gitignore` first.

## Global Project Rules

- Product name: Collecta.
- Product identity: SaaS de cobranza inteligente para despachos contables.
- Frontend: React 19, TypeScript, Vite, Tailwind-style CSS.
- Backend: Express 5, TypeScript, Prisma.
- Official DB target: PostgreSQL / Neon.
- Deploy target: Vercel frontend, Railway backend.
- Automation: n8n.
- WhatsApp: Evolution API self-host only if free; `wa.me` remains manual fallback.
- Smart Import: web-first, deterministic-first, provider-agnostic.
- Do not edit `.env` or commit secrets.
- Do not expose real phone numbers, tokens, API keys, or private URLs in docs or logs.
- Do not change `schema.prisma` unless this plan explicitly proves it is required.
- Do not modify auth architecture except for test-token usage already present.
- Do not reintroduce `.ai-*`, `.claude/`, PC runners, heartbeat, or local agent dashboards.
- Keep changes scoped to this plan.
- Preserve existing behavior unless this plan explicitly replaces it.
- Run tests/builds before reporting success.
- No commit or push unless the user explicitly requests it in that session.

## High-Autonomy Layer

Agents may proceed without asking for permission for:

- Creating the plan branch or local worktree.
- Reading repo files, docs, tests, logs, and package metadata.
- Running Docker, local Postgres test DB, backend dev server, frontend Vite, builds, lint, and tests.
- Creating deterministic test fixtures and local-only generated files under `docs/reports`, `docs/qa`, or `fixtures`.
- Opening the browser and testing local routes.
- Downloading free documentation or free tooling needed for production-grade methodology.
- Dispatching up to 5 subagents, each with strict file ownership.
- Waiting for other agents or another session to finish a blocking file, while continuing non-conflicting tasks.
- Creating code, tests, and docs that are clearly within this plan.

Agents must stop and ask the user before:

- Entering credentials or secrets.
- Creating accounts or projects in Supabase, Railway, Vercel, Evolution, n8n, Meta, or any external provider.
- Changing hosted env vars, deployment settings, domains, billing, webhooks, or production data.
- Sending real WhatsApp messages to the user's number.
- Uploading user data or real client data to any external service.
- Running destructive DB operations outside a proven local/test database.
- Pushing branches or opening PRs.

If login is needed, open the platform login page in the browser and leave the user at the login screen. Do not type credentials.

## Coordination Rules For Other Sessions

- If Plan 07 changes auth/middleware while Plan 06 is running, Plan 06 must continue using current test auth until Plan 07 publishes its branch and contract.
- If Plan 08 changes scripts/docs while Plan 06 is running, Plan 06 must not edit the same files.
- If another session owns a shared file, pause only that task and continue with independent tasks.
- Shared files require integrator review:
  - `backend/prisma/schema.prisma`
  - `backend/src/index.ts`
  - `backend/src/middleware/auth.ts`
  - `frontend/src/App.tsx`
  - `frontend/src/components/MainLayout.tsx`
  - `frontend/src/types/index.ts`
  - `frontend/package.json`
  - `backend/package.json`
  - `.github/workflows/*`

## Suggested 5-Agent Split

Agent 1 - Smart Import E2E Fixture

- Owns:
  - `frontend/src/features/smart-import/**`
  - `frontend/src/views/RegistersView.tsx`
  - new fixture files under `frontend/src/features/smart-import/__fixtures__/`
- Builds a chaotic 10-client import fixture.
- Verifies mapping confidence, warnings, preview, and commit.

Agent 2 - Backend Payment Correlation

- Owns:
  - `backend/src/services/paymentDetection.ts`
  - `backend/src/routes/webhooks.ts`
  - new backend tests for webhook payment correlation
- Implements safe deterministic correlation between outbound collection messages and incoming payment confirmations.

Agent 3 - Cobranza Buttons And Statements

- Owns:
  - `frontend/src/views/DashboardView.tsx`
  - `frontend/src/components/cobranza/**`
  - `backend/src/routes/cobranza.ts`
  - `backend/src/services/statementDeliveryService.ts`
- Verifies individual buttons: WhatsApp, PDF, estado de cuenta, registrar pago, archivar, excluir.

Agent 4 - Logs, Reports, And Config Buttons

- Owns:
  - `frontend/src/views/LogView.tsx`
  - `frontend/src/views/ConfigView.tsx`
  - `frontend/src/services/logService.ts`
  - `backend/src/routes/logs.ts`
- Ensures logs and report buttons show E2E evidence without raw noise.

Agent 5 - Browser QA And Runbook

- Owns:
  - `docs/reports/FULL_CYCLE_COBRANZA_E2E_RUNBOOK.md`
  - `docs/reports/FULL_CYCLE_COBRANZA_E2E_RESULTS.md`
  - optional screenshots under `docs/reports/qa/`
- Runs local browser QA and documents exact manual steps.

## Technical Contract

### Import Fixture Requirements

Create a chaotic file fixture with exactly 10 clients and 10 operations. It must include:

- Title rows before the actual table.
- At least one blank row.
- Headers not in canonical order.
- Mixed labels, for example `Cliente`, `RFC`, `Celular`, `Adeudo`, `Limite`, `Servicio`, `Correo`, `Asesor`.
- Amount values with currency formatting.
- Dates in at least two formats.
- One client with missing phone.
- One client with missing email.
- One duplicate-looking client that must not create duplicate operation if rerun.

Expected canonical fields:

- `client.rfc`
- `client.nombre`
- `client.telefono`
- `client.email`
- `operation.tipo`
- `operation.descripcion`
- `operation.monto`
- `operation.fechaVence`
- `operation.asesor`

### Payment Confirmation Correlation

The system must not mark paid just because a message says "ya pague".

Safe automatic payment requires:

- An incoming WhatsApp message from a phone number that matches a known client.
- At least one previous outbound collection WhatsApp message or statement attempt to that same client/phone.
- Exactly one open operation for that client when the incoming text has no amount.
- Or one open operation matching amount if the incoming text contains a parsable amount.
- The operation is not archived, excluded, or already paid.
- An audit log is created with the reason for automatic acceptance.

If there are multiple open operations and no amount, the system must create `REVIEW_REQUIRED` and not mark paid.

Suggested accepted phrases:

- `ya pague`
- `ya pagué`
- `pagado`
- `transferido`
- `te mande comprobante`
- `envie comprobante`
- `liquidado`

Suggested rejected/non-payment phrases:

- `pago mañana`
- `luego pago`
- `no puedo pagar`
- `cuanto debo`
- `manda factura`

### Real WhatsApp Test

The real user-number test is manual and requires explicit user confirmation at runtime.

Steps:

1. Ask user for the test phone number only when ready.
2. Ask explicit permission before sending any real WhatsApp message.
3. Send only test cobranza text and/or test PDF statement.
4. Ask user to reply from that same number with the agreed confirmation text.
5. Verify webhook receives it.
6. Verify operation is marked paid only if safe.
7. Redact phone number in report except last 4 digits.

## Tasks

### Task 0: Baseline And Branch Safety

- Confirm branch is `codex/plan06-full-cycle-cobranza-e2e`.
- Run:

```powershell
git status --short
cd backend; npm run test:prepare
cd ..\frontend; npm run build
cd ..\backend; npm run build
```

Expected:

- Clean or understood worktree.
- Test DB reachable.
- Frontend build passes.
- Backend build passes.

### Task 1: Create Chaotic Import Fixture

Files:

- Create: `frontend/src/features/smart-import/__fixtures__/chaotic-10-client-workbook.ts`
- Test: `frontend/src/features/smart-import/domain/full-cycle-import-fixture.test.ts`

Required assertions:

- 10 canonical rows are produced.
- At least 9 RFCs map with high confidence.
- All 10 operations include amount and due date.
- Missing phone/email produce warnings, not blocking errors.

### Task 2: Browser Import Flow

Files:

- Modify only if needed:
  - `frontend/src/features/smart-import/components/ImportWizard.tsx`
  - `frontend/src/features/smart-import/components/MappingReviewTable.tsx`
  - `frontend/src/features/smart-import/components/PreviewGrid.tsx`

Browser steps:

1. Open `http://localhost:5173/registros`.
2. Upload the generated chaotic fixture.
3. Verify sheet/region selection.
4. Verify mapping table.
5. Accept mapping.
6. Commit.
7. Verify success toast.
8. Open `/`.
9. Verify operations appear.

### Task 3: Backend Payment Correlation

Files:

- Modify: `backend/src/services/paymentDetection.ts`
- Modify: `backend/src/routes/webhooks.ts`
- Test: `backend/src/__tests__/paymentConfirmationCorrelation.test.ts`

Required test cases:

- Marks paid when one open operation exists and incoming phone has previous outbound cobranza.
- Requires review when multiple open operations exist and message has no amount.
- Marks exact operation paid when message includes matching amount.
- Does not mark paid if no previous outbound cobranza exists.
- Does not mark paid on future-payment language.
- Prevents duplicate payment confirmation from changing another operation.

### Task 4: Buttons And Statement Delivery

Files:

- Modify only if needed:
  - `frontend/src/components/cobranza/OperationInspector.tsx`
  - `frontend/src/components/cobranza/CollectionActionBar.tsx`
  - `frontend/src/views/DashboardView.tsx`
  - `backend/src/__tests__/cobranzaStatementRoutes.test.ts`

Verify:

- `WhatsApp` disabled reason appears when phone is missing.
- `PDF` generates or opens statement.
- `Estado de cuenta` calls the authenticated endpoint.
- `Registrar pago` updates operation.
- `Archivar`, `Excluir`, and `Eliminar` keep confirmation behavior.

### Task 5: Config And Report Buttons

Files:

- Modify only if needed:
  - `frontend/src/views/ConfigView.tsx`
  - `frontend/src/views/LogView.tsx`
  - `backend/src/routes/logs.ts`

Required UI:

- A clear way to inspect recent E2E logs.
- Buttons or links to export/review relevant records if already supported.
- No secrets or full real phone numbers in UI reports.

### Task 6: Full Local Verification

Run:

```powershell
cd frontend
npm run build
npm test
cd ..\backend
npm run build
npm run test:full
```

Manual:

- Open `/registros`.
- Import the chaotic 10-client fixture.
- Accept mapping.
- Open `/`.
- Verify 10 operations.
- Select one operation.
- Send statement in local/test mode.
- Simulate Evolution webhook with incoming payment text.
- Verify operation becomes paid.
- Open `/logs`.
- Verify audit trail.

### Task 7: Real WhatsApp Manual Test

Only after local test passes:

- Ask the user for explicit permission to use their phone number.
- Ask the user to log in or connect Evolution/n8n if needed.
- Leave browser at login screen if credentials are required.
- Send one controlled test message only after confirmation.
- Wait for the user to reply.
- Verify automatic or review-required result.

### Task 8: Documentation

Create:

- `docs/reports/FULL_CYCLE_COBRANZA_E2E_RUNBOOK.md`
- `docs/reports/FULL_CYCLE_COBRANZA_E2E_RESULTS.md`

The runbook must include:

- Local setup.
- Test credentials source.
- Fixture description.
- Browser steps.
- WhatsApp real-test steps.
- Expected logs.
- Failure triage.
- Free-production methodology.

The results report must include:

- Date.
- Branch.
- Commit hash if any.
- Test commands.
- Browser routes tested.
- Whether real WhatsApp was tested.
- Redacted phone if used.
- Residual risks.

## Verification Required

Minimum:

```powershell
cd frontend
npm run build
npm test
cd ..\backend
npm run build
npm run test:full
```

Browser:

- `/registros`
- `/`
- `/directorio`
- `/pagos/revision`
- `/logs`
- `/config`

## Success Criteria

- Chaotic 10-client file imports deterministically.
- Mapping is reviewable before commit.
- Commit creates clients and operations.
- Operations appear in cartera with correct buttons.
- Statement delivery endpoint works in test mode.
- Incoming WhatsApp payment confirmation is correlated safely.
- Safe confirmations mark paid.
- Ambiguous confirmations go to review.
- Logs show import, outbound, incoming, detection, and payment update.
- Runbook exists and is usable by another operator.

## Blockers Policy

If another session owns a needed file:

1. Do not edit that file.
2. Continue with tests, fixtures, docs, or non-conflicting modules.
3. Poll or ask for the other session's branch/commit when needed.
4. Integrate only after reviewing diffs.

## Expected Final Output

```md
## Files Changed
...

## E2E Result
...

## Local Verification
...

## Browser Verification
...

## Real WhatsApp Test
...

## Blockers
...

## Secret Safety
No secrets or .env files were modified.

## Git Safety
No commit or push was performed unless explicitly requested.
```
