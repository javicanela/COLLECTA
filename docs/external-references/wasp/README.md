# Wasp External Reference Log

## Purpose

This folder stores external Wasp knowledge used while building Collecta. It is historical implementation reference, not Collecta product specification and not a decision to migrate Collecta to Wasp.

Use it to build future process manuals, compare SaaS implementation patterns, and preserve the reasoning behind local tooling choices.

## Current Decision

Collecta remains a React/Vite + Express/Prisma/Postgres app.

Wasp is useful here as:

- A reference for batteries-included SaaS patterns.
- A guided checklist for auth, email, database, styling, deployment and dev-server workflows.
- A prototyping option for separate experiments.

Wasp is not currently used as the Collecta runtime or framework.

## Installed Assets

The command below installed Wasp agent skills into this repo:

```powershell
npx skills add wasp-lang/wasp-agent-plugins
```

Installed skills:

- `add-feature`: guided SaaS feature setup patterns such as auth, email, database and styling.
- `deploying-app`: Railway/Fly deployment guidance for Wasp apps.
- `expert-advice`: codebase exploration plus Wasp-oriented improvement recommendations.
- `start-dev-server`: dev-server workflow with database, server logs and browser/debug visibility.
- `wasp-plugin-help`: inventory of plugin capabilities.
- `wasp-plugin-init`: imports Wasp knowledge into an agent memory file.

For Collecta, do not run `wasp-plugin-init` against `AGENTS.md` unless we explicitly decide to make Wasp knowledge global in this repo. This folder is the safer boundary.

## Local Runtime

The Wasp CLI package did not install natively on Windows in this environment. The package supports Linux/macOS for the current release, and the Windows Node runtime was also slightly below the requested version.

The working route is Ubuntu WSL with Linux Node:

```txt
/home/lenovo/.local/node-v24.14.1-linux-x64/bin/node
/home/lenovo/.local/node-v24.14.1-linux-x64/bin/npm
/home/lenovo/.local/node-v24.14.1-linux-x64/bin/wasp
```

Wrapper from PowerShell:

```powershell
.\scripts\wasp-wsl.ps1 version
```

Verified output:

```txt
0.23.0
```

## Wrapper Notes

`scripts/wasp-wsl.ps1`:

- Translates the current Windows path to a WSL path.
- Uses `wsl.exe --cd` so commands run in the same repo folder.
- Sets a Linux-only `PATH` for Wasp so the Wasp launcher can find Linux Node.
- Filters noisy WSL path translation warnings caused by stale Windows PATH entries.

This is the recommended command shape:

```powershell
.\scripts\wasp-wsl.ps1 version
.\scripts\wasp-wsl.ps1 new MyWaspApp -t saas
.\scripts\wasp-wsl.ps1 start
.\scripts\wasp-wsl.ps1 db migrate-dev --name init
```

Only run `start`, `db`, `build` or `deploy` inside an actual Wasp app directory.

## Patterns Borrowed For Collecta

### Dev Visibility

The `start-dev-server` skill reinforces the flow we want for Collecta:

1. Start the database safely.
2. Start backend with test/local env only.
3. Start frontend.
4. Use browser QA with console/network visibility.
5. Record ports, process ids and any required credentials.

This informed the Plan 05 manual QA flow in `docs/reports/UI_FIRST_COBRANZA_OPERATIVE_GUIDE.md`.

### Auth Architecture

The `add-feature` skill treats auth as a first-class SaaS feature rather than a local login form. For Collecta, the current recommendation is:

- Use Supabase Auth for identity.
- Store app data and memberships in Postgres tables.
- Resolve tenant, despacho and role on the backend from a verified JWT.
- Support Google OAuth plus email/password or magic link for MVP.
- Add invitations and roles for B2B operations.

### Feature Implementation

Wasp's feature checklist is useful as a review prompt:

- What provider owns identity or delivery?
- Which environment variables are required?
- What database tables or memberships are implied?
- What fallbacks exist if the provider is absent?
- How do we verify the flow end to end?

For Collecta, this checklist should be applied manually to React/Express code rather than by generating Wasp files.

### Plan 05 Application

The first direct application was the cartera workbench inspector:

- Treat the inspector as a real feature surface, not a test-only patch.
- Define the reusable product contract first: priority, open balance, contact readiness, action availability and fallback reasons.
- Add tests for the priority/balance rules and disabled-action explanations.
- Build on existing Collecta primitives (`SidePanel`, `ActionButton`, `StatusBadge`) instead of introducing Wasp runtime code.

## Guardrails

- Do not paste Wasp-generated global knowledge into `AGENTS.md` without explicit approval.
- Do not migrate Collecta to Wasp without a written architecture decision.
- Do not run Wasp deployment commands against Collecta.
- Do not store credentials in this folder.
- Keep command outputs sanitized and historical.
