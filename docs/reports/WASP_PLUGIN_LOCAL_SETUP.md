# Wasp Plugin Local Setup

Historical Wasp notes and command evidence now live in `docs/external-references/wasp/`. Keep this report as the short operational setup guide.

## Current State

- Wasp agent skills were installed with `npx skills add wasp-lang/wasp-agent-plugins`.
- Installed local skills:
  - `add-feature`
  - `deploying-app`
  - `expert-advice`
  - `start-dev-server`
  - `wasp-plugin-help`
  - `wasp-plugin-init`
- The Wasp CLI package does not support native Windows for the current release. The working path is WSL Ubuntu.

## WSL Runtime

Wasp CLI is installed in Ubuntu WSL with a Linux Node runtime:

```bash
~/.local/node-v24.14.1-linux-x64/bin/node
~/.local/node-v24.14.1-linux-x64/bin/npm
~/.local/node-v24.14.1-linux-x64/bin/wasp
```

Verified command:

```powershell
.\scripts\wasp-wsl.ps1 version
```

Expected output starts with:

```txt
0.23.0
```

## Windows Wrapper

Use this wrapper from PowerShell:

```powershell
.\scripts\wasp-wsl.ps1 version
.\scripts\wasp-wsl.ps1 new MyWaspApp -t saas
.\scripts\wasp-wsl.ps1 start
```

The wrapper:

- Translates the current Windows directory into a WSL path.
- Adds the Linux Node/Wasp installation to `PATH`.
- Executes `wasp` inside Ubuntu.

## How To Use The Plugin Features

For a real Wasp app:

1. Open the Wasp project folder.
2. Use `.\scripts\wasp-wsl.ps1 start db` if the app uses managed Postgres.
3. Use `.\scripts\wasp-wsl.ps1 start` to run the Wasp app.
4. Ask the agent to use the installed skill you need:
   - `start-dev-server` for full dev server workflow.
   - `add-feature` for auth/email/database/styling guidance.
   - `expert-advice` for product and architecture recommendations.
   - `deploying-app` for Railway/Fly deployment guidance.

## Collecta-Specific Guidance

Collecta is currently a React/Vite + Express/Prisma app, not a Wasp app. Do not run `wasp start` in the Collecta root expecting it to replace the existing dev flow.

Use Wasp plugin functionality in Collecta as:

- Reference for auth patterns, especially Google OAuth, email/password, invitations and SaaS roles.
- Reference for deployment workflows and dev-server discipline.
- A way to create or inspect separate Wasp prototypes if we decide to compare approaches.

Do not migrate Collecta to Wasp without an explicit product/architecture decision.

## Future Agent Note

Newly installed skills may require restarting Codex before they appear in the automatic skill list. Until then, agents can read them from:

```txt
.agents/skills/<skill-name>/SKILL.md
```

The Wasp knowledge import (`wasp-plugin-init`) should only be applied to `AGENTS.md` for projects that are actually Wasp-based, or if the user explicitly wants Wasp guidance globally in the repo. For Collecta, this report is the safer source of truth.
