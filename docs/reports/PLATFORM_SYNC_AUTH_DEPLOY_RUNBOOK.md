# Platform Sync Auth And Deploy Runbook

## Purpose

This runbook defines how Codex can use the local browser, system tools and connected platform plugins to prepare Supabase Auth, Railway and Vercel work without accidentally changing production resources.

## Current Local Findings

- No `.vercel/project.json` exists in the repo root.
- Vercel connector is available, but current connector account returned no teams during read-only inspection.
- Railway CLI exists locally as `railway.ps1`.
- Supabase CLI was not found in the current PATH during this check.
- No Supabase frontend env vars such as `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are currently wired in the repo.

## Allowed Without Extra Confirmation

- Open Supabase, Railway or Vercel in the browser.
- Inspect read-only dashboard pages after the user logs in.
- Read project names, non-secret project IDs, deployment status, build logs and public URLs.
- Compare platform settings against local docs.
- Draft env var names and setup steps.
- Produce SQL/auth design docs without executing them.

## Requires Explicit Confirmation

Before doing any of the following, Codex must stop and ask for confirmation:

- Create a Supabase/Railway/Vercel project.
- Add, edit or delete environment variables.
- Connect GitHub repos.
- Trigger production deployments.
- Promote, rollback or delete deployments.
- Run SQL against a hosted database.
- Enable OAuth providers.
- Configure domains, callbacks or redirect URLs.
- Transmit secrets, tokens, connection strings or production data.

## Supabase Auth Target Architecture

Recommended identity model for Collecta:

- Supabase Auth owns user identity and OAuth/session flows.
- Collecta backend verifies Supabase JWTs.
- App authorization lives in Postgres app tables:
  - `profiles`
  - `organizations` or `despachos`
  - `memberships`
  - `invites`
- Role and tenant decisions must not rely on user-editable metadata.
- Frontend uses publishable/anon key only.
- Backend never exposes service role keys to the browser.

## Browser Login Procedure

When platform access is needed:

1. Codex opens the platform login page in the visible browser.
2. User enters credentials and handles MFA.
3. Codex waits until the dashboard is visible.
4. Codex performs read-only inspection first.
5. Any write action is summarized before execution.

## Supabase Setup Checklist

Read-only discovery:

- Project ref.
- Region.
- Auth providers enabled.
- Site URL.
- Redirect URLs.
- Database connection mode available for backend.

Potential future env vars:

Frontend:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Backend:

```txt
SUPABASE_JWT_ISSUER
SUPABASE_JWT_AUDIENCE
SUPABASE_JWKS_URL
```

Only if backend admin operations are explicitly required:

```txt
SUPABASE_SERVICE_ROLE_KEY
```

## Railway Checklist

Read-only discovery:

- Backend service name.
- Latest deploy status.
- Health endpoint.
- Public backend URL.
- Variable names present, without reading secret values.

Write actions require confirmation:

- Add/change env vars.
- Redeploy service.
- Link database.
- Change healthcheck settings.

## Vercel Checklist

Read-only discovery:

- Project linked or not linked.
- Framework/root directory.
- Build command.
- Output directory.
- Latest preview/production deployments.
- Public frontend URL.

Write actions require confirmation:

- Link project.
- Add env vars.
- Deploy preview/production.
- Promote or rollback.
- Change domains.

## Recommended Sequence

1. Finish Plan 05 UI-first locally.
2. Add Supabase Auth implementation plan and migration plan.
3. Create/inspect Supabase project.
4. Configure OAuth redirect URLs for local and deployed frontend.
5. Implement backend JWT verification behind a feature flag or auth adapter.
6. Verify local login flow.
7. Configure Railway backend env vars.
8. Configure Vercel frontend env vars.
9. Deploy preview.
10. Promote only after QA.

## Residual Risks

- OAuth callback URLs are easy to misconfigure across localhost, Vercel preview and production.
- JWT verification must validate issuer/audience/signature, not just decode payloads.
- RLS/app authorization must be designed before exposing any table through Supabase Data API.
- Railway and Vercel env vars can drift if changed manually; document every platform mutation.

