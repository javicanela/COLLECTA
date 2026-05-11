# Plan 05 Local Browser QA Run - 2026-05-11

## Scope

Validated the Plan 05 cartera workbench changes in a real local browser against the test database.

## Environment

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5173`
- Database: `collecta_test` on local PostgreSQL
- Browser: Google Chrome with local DevTools port `9223`

The Codex in-app browser runtime failed to initialize in this session with a local asset-path error. Fallback used Chrome DevTools Protocol against a visible local Chrome window.

## Start Commands

Prepare test database:

```powershell
cd backend
npm run test:prepare
```

Start backend:

```powershell
cd backend
node --env-file=.env.test --max-old-space-size=4096 -r ts-node/register src/index.ts
```

Start frontend:

```powershell
cd frontend
$env:VITE_API_URL='http://localhost:3001/api'
npm run dev -- --host localhost --port 5173 --strictPort
```

Open browser for inspectable QA:

```powershell
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' `
  --remote-debugging-port=9223 `
  --user-data-dir="$env:TEMP\collecta-chrome-qa-profile" `
  --no-first-run `
  --new-window `
  http://localhost:5173/
```

## Login Process

Use local test credentials from `backend/.env.test`.

For the default `.env.test.example`:

- User: `admin`
- Password: `test-admin-password`

Do not use or document production credentials in this runbook.

## QA Fixture

Created or reused this test-only fixture through authenticated local API calls:

- Client: `Cliente QA Inspector`
- RFC: `QAA260511QA1`
- Email: `qa-inspector@example.com`
- Phone: blank, intentionally used to validate disabled WhatsApp reason
- Operation: `QA inspector overdue balance`
- Amount: `$1,700.00`
- Due date: `2026-05-01T00:00:00.000Z`

## Assertions

Confirmed in browser:

- Login succeeds and stores a local auth token.
- Cartera loads the QA overdue operation.
- Row action `Ver detalle` opens the side inspector.
- Inspector shows `Cliente QA Inspector`.
- Inspector shows priority `Atencion inmediata`.
- Inspector shows `Saldo del cliente` with `$1,700.00`.
- WhatsApp action is disabled when the client has no phone.
- Disabled reason is present: `Falta telefono del cliente`.
- Inspector includes `Estado de cuenta` and channel readiness information.

Screenshot evidence:

```txt
docs/reports/plan05-operation-inspector-qa.png
```

## Notes

- This QA run uses only local/test infrastructure.
- The fixture is intentionally safe to recreate.
- Browser automation used real input events for the login form because direct DOM value mutation did not update the controlled React password input reliably.

