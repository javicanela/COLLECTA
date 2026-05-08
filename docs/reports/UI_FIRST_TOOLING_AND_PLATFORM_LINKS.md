# UI First Tooling And Platform Links

## Available Local Tooling

Repo:

- `C:\Users\LENOVO\Documents\New project`
- Branch actual: `chore/repo-cleanup-and-definitive-plan`
- Plan 04 backend DB-backed verification passed after `npm run test:prepare`.

Frontend:

- Vite dev server: `cd frontend && npm run dev`
- Production build: `cd frontend && npm run build`
- Unit tests: `cd frontend && npm test`
- Lint: `cd frontend && npm run lint`
- Preview server: `cd frontend && npm run preview`

Backend:

- Test DB preparation: `cd backend && npm run test:prepare`
- Build: `cd backend && npm run build`
- Full tests: `cd backend && npm run test:full`
- Integration tests: `cd backend && npm run test:integration`
- Local test DB: `docker-compose.test.yml` with PostgreSQL 16 at `localhost:5432`.

Installed frontend libraries relevant to UI:

- `lucide-react` for icons.
- `framer-motion` for transitions and small interaction feedback.
- `react-router-dom` for route structure.
- `zustand` for existing operation/client/auth stores.
- TailwindCSS v4 via Vite plugin and CSS tokens in `frontend/src/index.css`.

## Design And Asset Tools

Available but not required for this iteration:

- Figma connector/tooling is available in the environment.
- Canva connector/tooling is available in the environment.
- Local docs and UI audit are enough for the first implementation pass.

Decision:

- Do not require Figma or Canva for Plan 05 implementation.
- Use repository docs and browser screenshots as the source of truth.
- Request Figma/Canva only if a visual handoff artifact outside the repo becomes necessary.

## Image Generation / Editing

Decision:

- Do not generate bitmap assets for the first Plan 05 pass.
- Collecta is an operational B2B dashboard; data, status, actions, and auditability matter more than illustration.
- Empty states should use concise copy, icons, and existing UI primitives instead of heavy images.

Deferred:

- Generated images for polished marketing or onboarding assets.
- Custom illustrations for empty states.

## 3D / Motion / Animation Tools

Available:

- `framer-motion` is installed and already used.

Decision:

- Use motion sparingly for route transitions, side panels, queue changes, and loading state clarity.
- Do not add Three.js or 3D assets.
- Do not add decorative animations to operational dashboards.
- Respect `prefers-reduced-motion`.

## Browser Testing Tools

Available:

- Vite dev server can serve the app locally.
- Codex can use local browser/computer workflows when visual checks are needed.
- A global Playwright CLI may exist on the machine, but Playwright is not installed in the repo.

Decision:

- Use the in-app/browser tooling for manual visual QA in this iteration.
- Do not add repo-integrated Playwright until visual regression is needed in CI.
- Use `npm run build`, `npm test`, and browser route sweeps as the first verification layer.

## Screenshot And Visual QA Workflow

Start services:

```powershell
cd "C:\Users\LENOVO\Documents\New project\backend"
npm run test:prepare
node --env-file=.env.test --max-old-space-size=4096 -r ts-node/register src/index.ts
```

```powershell
cd "C:\Users\LENOVO\Documents\New project\frontend"
npm run dev -- --host localhost --port 5173 --strictPort
```

Routes to inspect:

- `http://localhost:5173/`
- `http://localhost:5173/registros`
- `http://localhost:5173/agente`
- `http://localhost:5173/pagos/revision`
- `http://localhost:5173/sistema/diagnostico`
- `http://localhost:5173/logs`
- `http://localhost:3001/api/health`

Viewport sweep:

- 1440x900 desktop.
- 1366x768 laptop.
- 1024x768 tablet landscape.
- 768x1024 tablet portrait.
- 390x844 mobile.
- 360x800 narrow mobile.

Checks:

- No horizontal page scroll except intentional data tables.
- Sidebar/header do not overlap content.
- Loading, empty, and error states are visible.
- Icon buttons have accessible labels or visible text.
- Text fits in buttons, tables, badges, and panels.
- Diagnostics and alerts never show secrets.

## Required Accounts Or External Platforms

Required:

- None for Plan 05 local UI implementation.

Optional:

- Figma or Canva if a stakeholder-ready design handoff is requested.
- Test Evolution, email, n8n, or provider credentials only for integration demos.

Data safety:

- Do not use real customer data.
- Do not use real phone numbers, emails, RFCs, receipts, API keys, or provider accounts in screenshots or tests.

## Tools Not Available In This Environment

- No repo-integrated Playwright setup.
- No Storybook or Chromatic setup.
- No dedicated visual regression CI.
- No project-specific design system file in Figma.

## Recommended Tooling For This Iteration

- Implement in React/TypeScript using existing components and Tailwind/CSS tokens.
- Use `lucide-react` icons.
- Use `framer-motion` only for useful state transitions.
- Use `npm run build`, `npm test`, and `npm run lint` for frontend verification.
- Use browser route sweeps for visual QA once services are running.
- Keep backend changes deferred unless the UI cannot reasonably derive state from current contracts.

## Deferred Tooling

- Playwright test suite for route screenshots.
- Storybook.
- Figma/Canva design boards.
- Three.js or 3D.
- Generated image assets.
- CI visual diffing.
