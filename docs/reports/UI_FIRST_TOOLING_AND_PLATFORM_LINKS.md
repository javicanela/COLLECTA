# UI First Tooling And Platform Links

## Available Local Tooling

- Frontend: React 19, TypeScript, Vite, `lucide-react`, `framer-motion`, Zustand.
- Backend: Express 5, Prisma, PostgreSQL local test DB.
- Tests: Vitest for frontend/backend.
- Build: `npm run build` in frontend and backend.
- Local DB prep: `cd backend; npm run test:prepare`.
- Wasp reference tooling: `.\scripts\wasp-wsl.ps1 version` through Ubuntu WSL.

## Design And Asset Tools

- Local implementation should use existing React components and CSS tokens first.
- Figma/Canva are available as possible external design tools, but not required for this iteration.
- No external design files were needed for the current UI work.

## Image Generation / Editing

- Not required for operational screens.
- Avoid decorative bitmap assets in core dashboards unless they clarify an empty state or onboarding task.
- Screenshot evidence is stored locally under `docs/reports/`.

## 3D / Motion / Animation Tools

- `framer-motion` is already installed and acceptable for small state transitions.
- No Three.js/3D should be introduced for operational dashboards.
- Prefer opacity/transform transitions; avoid layout-heavy animation.

## Browser Testing Tools

- Preferred: Codex in-app Browser plugin.
- Current fallback: visible Google Chrome with DevTools port `9223`, because the in-app browser runtime failed to initialize in this session.
- QA evidence:
  - `docs/reports/PLAN05_LOCAL_QA_BROWSER_RUN_2026-05-11.md`
  - `docs/reports/plan05-operation-inspector-qa.png`

## Screenshot And Visual QA Workflow

1. Prepare DB with `backend/npm run test:prepare`.
2. Start backend with `.env.test`.
3. Start frontend with `VITE_API_URL=http://localhost:3001/api`.
4. Log in with local test credentials.
5. Exercise the route with real UI events.
6. Capture screenshot to `docs/reports/`.
7. Record route, fixture, assertions and residual risk.

## Required Accounts Or External Platforms

- None required for current Plan 05 local UI iteration.
- Supabase Auth remains the recommended future identity provider, but needs explicit project/account access before implementation.
- Railway/Vercel deployment changes are out of scope for this UI-first block.

## Tools Not Available In This Environment

- Native Windows Wasp CLI is not viable for the current package release.
- In-app browser runtime had a local asset-path failure during this session.
- No confirmed Figma/Canva project access was used.

## Recommended Tooling For This Iteration

- Continue with local Vitest/build checks.
- Use Chrome DevTools fallback for browser QA until the in-app browser runtime is healthy.
- Use Wasp only as historical/reference guidance for SaaS feature checklists, not as Collecta runtime.

## Deferred Tooling

- Supabase connector/project configuration.
- Full Playwright test harness with checked-in E2E scripts.
- Visual regression snapshots across desktop/tablet/mobile.
- Figma/Canva handoff artifacts.

