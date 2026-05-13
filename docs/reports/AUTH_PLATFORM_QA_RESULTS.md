# Auth Platform QA Results

Date: 2026-05-13
Branch: `codex/plan07-auth-platform-persistence`

## Baseline Before Changes

- Frontend build: passed.
- Frontend tests: passed, 43 files / 140 tests.
- Backend build: passed.
- Backend full tests: passed, 22 files / 94 tests.

## Contract Tests Added

- API key auth maps to a stable service principal.
- Local admin login returns `authSource: local`.
- Missing auth and invalid tokens still return 401.
- Invalid token responses do not echo bearer token details.
- Provider token verification can be mocked without Supabase env vars.
- Provider JWT verification works through `/api/auth/verify`.
- Provider metadata cannot grant admin automatically.
- Frontend marks Supabase unavailable until `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist.
- Login provider panel disables the Supabase action when unconfigured.
- Sidebar footer exposes an explicit logout action.

## Provider Status

Supabase is not connected to a real project in this QA pass. That is intentional: no external project, hosted env var, callback URL, or OAuth app was created.

Current app behavior:

- Local login remains the active path.
- Supabase option is visible as unavailable when frontend env vars are absent.
- If frontend env vars are later configured, the UI can start Supabase OAuth.
- If backend verification env vars are configured, provider access tokens can be verified as bearer tokens.

## Final Verification

- Frontend build: passed.
- Frontend tests: passed, 47 files / 147 tests.
- Backend build: passed.
- Backend full tests: passed, 24 files / 106 tests.

Build note: Vite still reports the existing large chunk warning after production build.

## Browser QA

Local QA used isolated ports:

- Backend: `http://127.0.0.1:3002`
- Frontend: `http://127.0.0.1:5174`

Results:

- Local admin login reaches the protected app.
- Refresh preserves the session.
- Logout clears session state.
- Protected route `/config` shows login when unauthenticated.
- Supabase remains unavailable when env vars are missing.
- Supabase unavailable action is disabled.
- API key auth returns 200 for `/api/n8n/pending-collections` when `API_KEY` is configured.

QA note: the isolated frontend port required matching `ALLOWED_ORIGINS` on the isolated backend. This was only for local QA and did not require `.env` edits.

## Secret Safety

No `.env` files were modified. No real provider URLs, API keys, JWT secrets, OAuth secrets, or client data were added to docs or code.
