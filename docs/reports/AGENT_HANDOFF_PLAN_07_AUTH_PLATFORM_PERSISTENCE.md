# Agent Handoff Plan 07 - Auth Platform Persistence

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:using-git-worktrees` before implementation when available, then use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. This plan is designed for up to 5 parallel agents with strict file ownership.

## Goal

Implement a production-oriented identity and persistence path for Collecta users while preserving the current local/test login flow.

## One Responsibility

This plan owns authentication, user identity, session persistence, and external identity-provider readiness. It does not own cobranza E2E behavior, Smart Import, sales content, installation packaging, or UI redesign beyond auth screens and auth state.

## Accumulated Project Context

This plan must inherit the work already completed in prior phases. Do not restart discovery from zero.

Previous work that matters:

- Plan 02 delivered statement delivery with PDF, WhatsApp/email/fallback, n8n integration, Railway deployment verification, and authenticated cobranza endpoints.
- Plan 03 delivered Smart Import as a web-first, deterministic-first, provider-agnostic differentiator. Auth must not make Smart Import harder to test locally.
- Plan 04 delivered diagnostics/readiness. `/api/health` must remain lightweight; external checks belong in protected `/api/diagnostics/e2e-readiness`.
- Plan 05 delivered the operational app shell and core UI routes. Auth must protect this product experience without breaking the existing navigation and QA routes.
- Current local testing depends on `.env.test` defaults, `ADMIN_USER`, `ADMIN_PASS`, `API_KEY`, and `JWT_SECRET` fallbacks in test setup. Do not remove or weaken them without replacing the full test flow.
- n8n and service integrations currently rely on API key/JWT-style backend auth. Human OAuth must not break service automation.
- The user prefers a free methodology and believes OAuth is probably correct, with Supabase Auth currently recommended as future provider. This is not permission to create or mutate a Supabase project without confirmation.
- If a provider login is needed, open the browser to the login page and stop so the user can log in manually.

Current verified baseline before this plan was created:

- `frontend npm run build`: passing.
- `frontend npm test`: passing, 43 files / 140 tests.
- `backend npm run build`: passing.
- `backend npm run test:full`: passing, 22 files / 94 tests.
- Browser QA verified local login and protected app routes.

Known product gap this plan must close:

- Collecta has a usable local/admin login and service auth, but not yet a production-oriented identity layer with durable external user accounts.
- The project needs a provider-ready architecture that can use Supabase Auth or a similar free-tier provider without scattering provider code across the app.

Known behavior expectations:

- Preserve local/test login and API key service auth.
- Do not expose secrets in logs, docs, UI, or error responses.
- Do not implement provider auth in a way that blocks Plan 06 E2E work.
- Do not make auth visually generic. The login/session experience must feel like part of Collecta's operating system.

## Exponential Quality Mandate

Each plan must increase Collecta's functionality, user experience, and operational trust by more than the previous one.

For Plan 07 that means:

- The app moves from local-only access toward real SaaS identity without sacrificing testability.
- Login, logout, session restore, protected-route behavior, and auth errors must feel intentional and reliable.
- The UI must communicate trust: clear state, no confusing OAuth buttons when unconfigured, no broken provider paths.
- The implementation must improve the future deployment story while keeping free/local workflows alive.
- The documentation must predict the user's next confusion: where to log in, what to configure, what not to commit, and what still needs approval.

## Required Branch

Each session implementing this plan must create and work only on:

```powershell
git checkout -b codex/plan07-auth-platform-persistence
```

If the branch already exists locally:

```powershell
git checkout codex/plan07-auth-platform-persistence
git pull --ff-only
```

If parallel local work is needed:

```powershell
git worktree add .worktrees/plan07-auth-platform-persistence -b codex/plan07-auth-platform-persistence
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
- Do not expose real tokens, API keys, OAuth client secrets, or private project URLs.
- Do not change business behavior in cobranza, Smart Import, payment detection, or reporting.
- Do not reintroduce legacy local-agent artifacts.
- Keep auth compatible with local development and automated tests.
- No commit or push unless the user explicitly requests it in that session.

## High-Autonomy Layer

Agents may proceed without asking for permission for:

- Creating the plan branch or local worktree.
- Reading Supabase, Firebase, Neon, Railway, Vercel, and OAuth docs.
- Opening provider dashboards in the browser for inspection.
- Leaving the browser on a provider login page for the user.
- Downloading free CLI tools or docs when needed.
- Running local tests, builds, Docker, and browser QA.
- Dispatching up to 5 subagents with strict file ownership.
- Implementing local adapters and mocks that do not require secrets.
- Waiting for Plan 06 or Plan 08 if a shared file is blocked, while continuing non-conflicting auth tasks.

Agents must stop and ask the user before:

- Creating an external project or app registration.
- Entering credentials.
- Changing OAuth callback URLs in a hosted provider.
- Modifying hosted env vars.
- Connecting GitHub, Railway, Vercel, Supabase, Firebase, or Neon accounts.
- Deploying, promoting, rolling back, or deleting hosted resources.
- Transmitting any real user/client data to a third-party service.
- Pushing branches or opening PRs.

If login is needed, open the provider page and stop at the login screen.

## Recommended Provider Direction

Preferred target: Supabase Auth, because it provides a free-tier identity layer, OAuth/email support, JWTs, and Postgres alignment.

Fallbacks:

- Current local admin login for development.
- API key/JWT auth for n8n and backend service calls.
- Firebase Auth only if Supabase access is unavailable or conflicts with deployment strategy.

Do not hard-wire the app to one provider without an adapter boundary.

## Coordination Rules For Other Sessions

Shared files require integrator review:

- `backend/prisma/schema.prisma`
- `backend/src/index.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/routes/auth.ts`
- `frontend/src/App.tsx`
- `frontend/src/services/authService.ts`
- `frontend/src/types/index.ts`
- `frontend/package.json`
- `backend/package.json`

If Plan 06 is active:

- Do not break `ADMIN_USER` / `ADMIN_PASS` local test login.
- Do not invalidate `API_KEY` service auth used by n8n tests.
- Do not change protected route names.

If Plan 08 is active:

- Coordinate docs and setup scripts.
- Plan 08 may document auth setup, but Plan 07 owns auth implementation.

## Suggested 5-Agent Split

Agent 1 - Auth Contract And Provider Research

- Owns:
  - `docs/reports/AUTH_PLATFORM_DECISION_RECORD.md`
  - `docs/reports/AUTH_PLATFORM_SETUP_RUNBOOK.md`
- Compares Supabase Auth, Firebase Auth, and local fallback.
- Defines free-production methodology and risk gates.

Agent 2 - Backend Auth Adapter

- Owns:
  - `backend/src/middleware/auth.ts`
  - `backend/src/routes/auth.ts`
  - new backend auth tests
- Adds provider-token verification behind an adapter.
- Preserves local admin and API key behavior.

Agent 3 - Frontend Auth State

- Owns:
  - `frontend/src/services/authService.ts`
  - `frontend/src/views/LoginView.tsx`
  - auth-related hooks/stores if present
- Implements session restore, logout, and error states.

Agent 4 - User/Roles Mapping

- Owns:
  - `backend/src/routes/users.ts` only if created
  - `backend/src/services/userIdentity.ts` if created
  - related tests
- Maps external identity to internal `User` records.
- Avoids schema changes unless justified.

Agent 5 - Browser QA And Docs

- Owns:
  - `docs/reports/AUTH_PLATFORM_QA_RESULTS.md`
  - screenshots under `docs/reports/qa/` if useful
- Tests login, logout, protected routes, refresh, and local fallback.

## Technical Contract

### Auth Modes

Support these modes:

1. Local admin mode for development and tests.
2. API key mode for n8n/internal automation.
3. Provider JWT mode for future Supabase Auth.

The middleware must answer:

- Who is the user?
- What role do they have?
- Is this service auth or human auth?
- Is the request allowed?

### Required User Shape

Use a stable internal shape:

```ts
type AuthenticatedPrincipal = {
  userId: string;
  email?: string;
  role: 'admin' | 'asesor' | 'viewer' | 'service';
  authSource: 'local' | 'api_key' | 'supabase' | 'test';
};
```

If existing types differ, create an adapter that emits this shape without forcing every caller to change.

### Provider Boundary

Create a provider adapter only if needed:

- `backend/src/services/authProvider.ts`
- `frontend/src/services/externalAuthProvider.ts`

Do not import Supabase directly across the app. Keep provider-specific code in one place.

### Environment Variables

Do not edit `.env`.

Document expected names only:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_JWT_SECRET` or JWKS URL depending on final verification method.
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Mark all as optional until user confirms provider setup.

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

If baseline fails, document it before implementation.

### Task 1: Decision Record

Create:

- `docs/reports/AUTH_PLATFORM_DECISION_RECORD.md`

Include:

- Supabase Auth recommendation.
- Firebase Auth fallback.
- Why local admin remains for dev.
- Why service API key remains for n8n.
- Free-tier constraints.
- Confirmation points requiring the user.

### Task 2: Backend Auth Contract Tests

Create or modify:

- `backend/src/__tests__/authMiddleware.test.ts`
- `backend/src/__tests__/auth.test.ts`

Required cases:

- API key still authenticates service routes.
- Local admin login still works.
- Missing auth returns 401.
- Invalid token returns 401 without leaking token details.
- Provider-token adapter can be mocked.

### Task 3: Backend Adapter

Modify:

- `backend/src/middleware/auth.ts`
- `backend/src/routes/auth.ts`

Optional create:

- `backend/src/services/authProvider.ts`

Rules:

- Preserve current tests.
- Do not require Supabase env vars in local/test mode.
- Use safe error messages.
- Do not log tokens.

### Task 4: Frontend Auth Flow

Modify:

- `frontend/src/services/authService.ts`
- `frontend/src/views/LoginView.tsx`
- `frontend/src/App.tsx` only if needed and coordinated.

Required UI states:

- Local login.
- Provider login available only when configured.
- Loading session restore.
- Logout.
- Auth error.
- Provider unavailable fallback.

### Task 5: User Mapping

Use existing `User` model if possible.

Only modify `schema.prisma` if:

- Current fields cannot represent external identity safely.
- A migration-free alternative is clearly worse.
- The integrator approves.

Preferred:

- Match by email.
- Create local user record on first verified provider login only after backend validates token.
- Default role: `asesor`.
- Admin role must not be granted automatically from provider data.

### Task 6: Browser QA

Run local services and verify:

- Login with local admin.
- Refresh preserves session if current app supports it.
- Logout clears session.
- Protected route redirects unauthenticated users.
- n8n/API key tests still pass.

If provider login is not configured:

- Show provider option as unavailable or hidden.
- Document required setup.

### Task 7: External Platform Handoff

If Supabase setup is needed:

1. Open Supabase dashboard.
2. Stop at login screen.
3. Tell user what to do:
   - Log in.
   - Create or select project.
   - Confirm free tier.
   - Return control.
4. After user confirms, inspect settings without exposing secrets.
5. Ask again before creating OAuth app, callback URLs, env vars, or DB changes.

### Task 8: Documentation

Create:

- `docs/reports/AUTH_PLATFORM_SETUP_RUNBOOK.md`
- `docs/reports/AUTH_PLATFORM_QA_RESULTS.md`

Include:

- Local auth.
- Service auth.
- Supabase setup steps.
- Callback URL checklist.
- Vercel/Railway env checklist.
- What remains manual.
- What must never be committed.

## Verification Required

```powershell
cd frontend
npm run build
npm test
cd ..\backend
npm run build
npm run test:full
```

Browser:

- Login.
- Logout.
- Protected route.
- Refresh.
- API error state.

## Success Criteria

- Auth has a clear provider-ready architecture.
- Local login still works.
- API key auth still works.
- Provider auth can be enabled without rewriting app routes.
- No secrets are stored or printed.
- Setup runbook explains exactly where user intervention is required.
- Tests and builds pass.

## Blockers Policy

If provider account access is unavailable:

- Finish local/provider adapter implementation with mocks.
- Create runbook.
- Leave browser at provider login page only when the next step truly requires user login.

If another session is modifying shared auth files:

- Pause those edits.
- Continue docs, tests, frontend states, or provider research.
- Integrate only after reviewing the other session's branch.

## Expected Final Output

```md
## Files Changed
...

## Auth Architecture
...

## Provider Status
...

## Verification
...

## User Action Needed
...

## Secret Safety
No secrets or .env files were modified.

## Git Safety
No commit or push was performed unless explicitly requested.
```
