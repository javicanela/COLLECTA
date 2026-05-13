# Agent Handoff Plan 08 - Installation Operations Readiness

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:using-git-worktrees` before implementation when available, then use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. This plan is designed for up to 5 parallel agents with strict file ownership.

## Goal

Make Collecta easy to install, run, verify, and hand off using free/local-first production methodology.

## One Responsibility

This plan owns installation, local operations, environment runbooks, QA scripts, and operator handoff. It does not own cobranza product behavior, auth implementation, sales copy, pricing, landing pages, or external deployment mutation.

Business and sales enablement should be a later separate plan, for example Plan 09.

## Accumulated Project Context

This plan must inherit the work already completed in prior phases. Do not restart discovery from zero.

Previous work that matters:

- Plan 02 delivered PDF statement delivery, WhatsApp/email/fallback behavior, n8n workflow support, Railway deployment verification, and authenticated statement endpoints.
- Plan 03 delivered Smart Import as the central product differentiator. Setup docs must make this easy to run and test without external providers.
- Plan 04 delivered connectivity diagnostics and made a key architectural decision: `/api/health` stays lightweight; `/api/diagnostics/e2e-readiness` owns protected readiness checks.
- Plan 05 delivered the operational UI and browser-tested routes: cartera, Smart Import, agente, pagos, diagnostico, logs, and mobile navigation.
- Local integration tests previously failed because `.env.test` pointed to localhost Postgres without a running DB. The permanent direction is to make test DB startup obvious and repeatable, not to accept manual tribal knowledge.
- Docker Desktop was used successfully to run `collecta-test-postgres`; `backend npm run test:prepare` prepares the DB and Prisma schema.
- Browser QA is now expected for useful frontend validation, not optional.
- Wasp knowledge was installed under `.agents/skills` through WSL Ubuntu and documented as external reference. It is useful for process ideas, not a runtime dependency.
- Disk pressure happened during parallel agent work. Scripts and runbooks should report free space and keep heavy logs/artifacts outside the repo when possible.

Current verified baseline before this plan was created:

- `frontend npm run build`: passing.
- `frontend npm test`: passing, 43 files / 140 tests.
- `backend npm run build`: passing.
- `backend npm run test:full`: passing, 22 files / 94 tests.
- Docker test Postgres was healthy and reachable at localhost:5432.

Known product gap this plan must close:

- The project works, but setup knowledge is still distributed across conversations, handoff notes, and operator memory.
- A new session or teammate should be able to start, test, inspect, and hand off Collecta without asking which commands or ports matter.

Known behavior expectations:

- Do not create paid-service dependencies.
- Do not hide fragile setup behind vague docs. Make scripts and runbooks precise.
- Do not edit secrets or `.env`.
- Prefer permanent workflow improvements over one-off fixes.
- When external platforms are involved, document exactly where the user must log in and what action requires confirmation.

## Exponential Quality Mandate

Each plan must increase Collecta's functionality, user experience, and operational trust by more than the previous one.

For Plan 08 that means:

- The developer/operator experience becomes part of the product quality.
- Starting the app, preparing the DB, testing, opening routes, and diagnosing failures must become simpler than in previous plans.
- Visual/product quality improves indirectly through reliable browser QA, repeatable screenshots/checklists, and fewer environment surprises.
- The docs must reduce future confusion: commands, ports, login points, free-platform choices, secrets policy, and failure triage must be explicit.
- The plan must make parallel work safer by giving future sessions shared operating procedures.

## Required Branch

Each session implementing this plan must create and work only on:

```powershell
git checkout -b codex/plan08-installation-operations-readiness
```

If the branch already exists locally:

```powershell
git checkout codex/plan08-installation-operations-readiness
git pull --ff-only
```

If parallel local work is needed:

```powershell
git worktree add .worktrees/plan08-installation-operations-readiness -b codex/plan08-installation-operations-readiness
```

Before creating `.worktrees`, verify it is ignored.

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
- Do not require paid services.
- Do not change business logic.
- Do not change auth behavior unless Plan 07 has already published a compatible contract.
- Do not modify production deployment settings without explicit user confirmation.
- Do not push branches or open PRs unless explicitly requested.

## High-Autonomy Layer

Agents may proceed without asking for permission for:

- Creating the plan branch or local worktree.
- Reading repo docs, scripts, package files, Docker files, CI files, and test outputs.
- Running Docker, local Postgres, tests, builds, dev servers, and browser QA.
- Creating scripts that simplify local setup when they do not require secrets.
- Creating example env files that contain placeholder values only.
- Opening documentation, browser pages, or local apps.
- Downloading free CLI/documentation needed for production-grade local methodology.
- Dispatching up to 5 subagents with strict file ownership.
- Waiting for Plan 06 or Plan 07 if shared files are blocked, while continuing independent docs/scripts.

Agents must stop and ask before:

- Logging into Railway, Vercel, Supabase, Firebase, Neon, Evolution, n8n, or GitHub.
- Creating external resources.
- Editing hosted env vars.
- Deploying, promoting, rolling back, deleting, or connecting external projects.
- Uploading real client data.
- Installing globally if local or WSL project-local alternative works.
- Pushing branches or opening PRs.

If login is needed, open the login page and leave the user there.

## Coordination Rules For Other Sessions

Plan 08 should avoid files owned by Plan 06 and Plan 07 unless the integrator approves.

Shared files requiring coordination:

- `.gitignore`
- `README.md`
- `backend/package.json`
- `frontend/package.json`
- `docker-compose.test.yml`
- `.github/workflows/*`
- `backend/.env.test.example`
- `frontend/.env.example` if created
- `backend/src/index.ts`
- `backend/src/middleware/auth.ts`

Plan 08 may document Plan 06 and Plan 07 flows but must not implement their core code.

## Suggested 5-Agent Split

Agent 1 - Local Bootstrap Scripts

- Owns:
  - `scripts/collecta-dev.ps1`
  - `scripts/collecta-test.ps1`
  - `scripts/collecta-doctor.ps1`
- Creates safe PowerShell helpers for Windows local development.

Agent 2 - Environment And Free Platform Runbooks

- Owns:
  - `docs/runbooks/ENVIRONMENT_SETUP.md`
  - `docs/runbooks/FREE_PLATFORM_OPTIONS.md`
  - `docs/runbooks/SECRETS_AND_ENV_SAFETY.md`
- Documents Railway/Vercel/Supabase/Neon/Firebase/n8n/Evolution free-methodology without making external changes.

Agent 3 - QA And Browser Verification

- Owns:
  - `docs/runbooks/QA_BROWSER_SCRIPT.md`
  - `docs/reports/INSTALLATION_OPERATIONS_QA_RESULTS.md`
- Defines repeatable browser tests across key routes.

Agent 4 - Demo Data And Reset Safety

- Owns:
  - `backend/scripts/seed-demo-data.ts` only if package supports it cleanly.
  - `backend/scripts/assert-safe-test-db.ts` if needed.
  - backend tests for safe DB guards.
- Adds demo/test data helpers that refuse production DB.

Agent 5 - Documentation Index And Operator Guide

- Owns:
  - `README.md`
  - `docs/README.md`
  - `docs/runbooks/OPERATOR_HANDOFF.md`
- Makes the repo navigable for future operators.

## Technical Contract

### Local Commands To Standardize

Provide a clear path for:

- Prepare test DB.
- Start backend.
- Start frontend.
- Run full tests.
- Run browser QA checklist.
- Stop local services if started by script.

Scripts must:

- Be Windows PowerShell friendly.
- Print ports and PIDs.
- Refuse destructive operations unless target DB is local/test.
- Avoid writing secrets.
- Avoid installing paid or external dependencies.

### Safe DB Guard

Any seed/reset helper must refuse to run unless:

- `NODE_ENV` is `test` or `development`.
- `DATABASE_URL` points to localhost, 127.0.0.1, Docker service, or an explicit test database name.
- It does not contain production-like hostnames.

### Free-Methodology Rule

Every external recommendation must say:

- Free tier availability.
- What account is needed.
- What data would be sent.
- What user confirmation is required.
- Local fallback if external platform is unavailable.

## Tasks

### Task 0: Baseline And Branch Safety

Run:

```powershell
git status --short
cd frontend
npm run build
npm test
cd ..\backend
npm run build
npm run test:full
```

Document any existing failures before changing files.

### Task 1: Create Runbook Directory

Create:

- `docs/runbooks/README.md`

It must link to:

- Environment setup.
- QA browser script.
- Secrets safety.
- Free platform options.
- Operator handoff.

### Task 2: PowerShell Doctor Script

Create:

- `scripts/collecta-doctor.ps1`

Checks:

- Node version.
- npm availability.
- Docker availability.
- Docker daemon status.
- Postgres test container status.
- Free disk space.
- Backend dependencies installed.
- Frontend dependencies installed.
- Required ports available: 3001 and 5173.

It must not modify system state.

### Task 3: PowerShell Dev Script

Create:

- `scripts/collecta-dev.ps1`

Behavior:

- Starts Docker test DB if available.
- Runs backend `npm run test:prepare`.
- Starts backend with `.env.test` if present.
- Starts frontend with `VITE_API_URL=http://localhost:3001/api`.
- Prints PIDs, URLs, and log file locations.

Logs should go outside the repo, for example:

```powershell
$env:TEMP\collecta-dev
```

### Task 4: PowerShell Test Script

Create:

- `scripts/collecta-test.ps1`

Behavior:

- Runs backend `npm run test:prepare`.
- Runs frontend build/test.
- Runs backend build/test.
- Prints summary.
- Exits non-zero on failure.

### Task 5: Safe Demo Data

Create only if useful:

- `backend/scripts/assert-safe-test-db.ts`
- `backend/scripts/seed-demo-data.ts`

Required behavior:

- Refuse production DB.
- Create deterministic demo clients and operations.
- Idempotent reruns.
- No real client data.

If TypeScript script execution would require dependency changes, prefer documenting the seed through existing API calls instead of changing package setup.

### Task 6: Environment Runbooks

Create:

- `docs/runbooks/ENVIRONMENT_SETUP.md`
- `docs/runbooks/SECRETS_AND_ENV_SAFETY.md`
- `docs/runbooks/FREE_PLATFORM_OPTIONS.md`

Must include:

- Local-only setup.
- Docker setup.
- Railway backend notes.
- Vercel frontend notes.
- Supabase/Neon/Firebase decision notes.
- n8n local/cloud notes.
- Evolution API self-host notes.
- What not to commit.

### Task 7: Browser QA Runbook

Create:

- `docs/runbooks/QA_BROWSER_SCRIPT.md`

Must include routes:

- `/`
- `/registros`
- `/directorio`
- `/agente`
- `/pagos/revision`
- `/sistema/diagnostico`
- `/logs`
- `/config`

For each route:

- What to click.
- What to verify.
- Expected empty/error/loading state.
- Mobile check.

### Task 8: Operator Handoff

Create:

- `docs/runbooks/OPERATOR_HANDOFF.md`

Include:

- How to start locally.
- How to run tests.
- How to inspect logs.
- How to verify import/cobranza/payment flows.
- How to stop services.
- How to escalate when external login is required.

### Task 9: Documentation Index

Modify:

- `README.md`
- Create or modify: `docs/README.md`

Rules:

- Keep concise.
- Link to runbooks.
- Do not rewrite product strategy.
- Do not add sales copy.

## Verification Required

Run:

```powershell
.\scripts\collecta-doctor.ps1
.\scripts\collecta-test.ps1
```

Also run raw commands:

```powershell
cd frontend
npm run build
npm test
cd ..\backend
npm run build
npm run test:full
```

Browser:

- Start with `.\scripts\collecta-dev.ps1`.
- Open `http://localhost:5173/`.
- Verify routes in `docs/runbooks/QA_BROWSER_SCRIPT.md`.

## Success Criteria

- New developer/operator can start Collecta locally from docs.
- Test DB setup is permanent and easy.
- Scripts do not touch secrets or production DB.
- Browser QA path is documented.
- Free platform options are clear.
- External login points are explicit.
- Docs point to Plan 06 and Plan 07 without owning their implementation.

## Blockers Policy

If Plan 06 or Plan 07 is editing a shared file:

1. Do not edit the shared file.
2. Continue with independent runbooks or scripts.
3. Reference the other plan as pending if needed.
4. Integrate only after reviewing the other branch.

If a script requires global install:

1. Prefer project-local or WSL alternative.
2. If global install is still best, ask the user first.

## Expected Final Output

```md
## Files Changed
...

## Installation Improvements
...

## Commands Verified
...

## Browser QA
...

## External Platforms
No external platform was modified unless explicitly confirmed.

## Secret Safety
No secrets or .env files were modified.

## Git Safety
No commit or push was performed unless explicitly requested.
```
