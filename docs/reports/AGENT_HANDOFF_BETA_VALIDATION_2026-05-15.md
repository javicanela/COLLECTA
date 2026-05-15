# Agent Hand-off — Beta validation walkthrough (2026-05-15)

## Branch / repo state
- Branch: `codex/integrate-agent-work` (clean, sincronizado con `origin/codex/integrate-agent-work`).
- Last commit on entry: `30a9117 feat: add abre-facil pwa offline workflow`.
- No code changes were produced this session — only manual validation was performed.

## Goal of the session
Walk through the full beta flow (setup → start → smart import → cartera → pago → offline) and produce challenging Smart Import fixtures, per the original 13-phase plan tracked in TaskCreate.

## Where we stopped
Mid-way through **Phase 7 (Smart Import with existing fixtures)**, while uploading the second fixture `data/archivo_ejemplo/Clientes_Dennise_2025.xlsx`. The session was interrupted just after invoking the file chooser via `document.querySelector('input[type=file]').click()` on `http://localhost:5173/registros`.

At interrupt time:
- Disk free on C: was **1.41 GB** (down from 2.72 GB at the start of phase 5). Doctor warns under 5 GB. This is the recurring risk that already blocked the run once.
- Backend (`http://localhost:3001/api/health`) and Vite frontend (`http://localhost:5173/`) were still up.
- Postgres test container `collecta-test-postgres` was reachable (TCP 5432 OK).

## What was completed in this session

| Phase | Status | Evidence |
|---|---|---|
| 1 | done | `git status` clean; branch synced with `origin/codex/integrate-agent-work`. |
| 3 | done | Ports 3001 / 5173 freed before start. |
| 4 | done | `scripts/collecta-setup.ps1` returned `EXIT=0`. `test:prepare` (db:guard → ensure-test-db → db:test:push) green. Doctor warnings only: Docker daemon transiently unreachable but Postgres TCP OK; free disk warning. |
| 5 | done | `scripts/collecta-dev.ps1 -Force` started backend (PID 3056, `/api/health` returned `{status:ok}`) and frontend (PID 20076). Logs under `%TEMP%\collecta-dev\`. PID file: `%TEMP%\collecta-dev\collecta-dev-pids.txt`. |
| 6 | done | Logged in as `admin` / `test-admin-password` (read from `backend/.env.test`). Sidebar (Cartera, Clientes, Importar, Exportar, Aprobaciones, Pagos, Diagnostico, Auditoria, Configuracion) renders. Status banners show `PRUEBA`, `Collecta Online`, `WA No config.`, `Sin API`, `Email Degradado`, `PDF OK`, `Diagnostico Degradado` — expected for local dev. The two console errors are Google Fonts 404s only (non-blocking). |
| 7 (partial) | first fixture done, second fixture pending | `data/archivo_ejemplo/prueba_importacion.csv` imported successfully: Smart Import detected 12 rows / 6 cols, region `R1:R11`, 89 % global confidence, 6 mappings (RFC, Nombre, Tipo, Monto, Fecha Vencimiento, Asesor). After clicking **Confirmar e Importar**, Cartera shows `Total 10 / Vencidas 10 / Por cobrar $27,100.00` with all 10 operations rendered (RFCs `COL860301H52` and `XAXX010101000`, asesores JAVI / ROBERTO / MARTHA). The full beta path file → preview → commit → cartera works. |

## What is still pending

In TaskCreate ordering:

7. **Phase 7 (finish)** — re-upload `data/archivo_ejemplo/Clientes_Dennise_2025.xlsx`, confirm the import, verify it lands on Cartera/Clientes without breaking the 10 existing operations. Note that the current admin auth was working ~5–10 min before interrupt; if the JWT expired, log in again.
8. **Phase 8** — generate **3 challenging Smart Import files** that stress the parser, plus a sanity baseline. Suggested set:
   - `desafio_1_layout_caotico.xlsx` — multi-sheet workbook with title rows, merged headers, blank columns, RFC and amounts in non-standard order, money formatted as `$1,234.56 MXN`, dates as `15/abr/26` mixed with `2026-04-15`.
   - `desafio_2_alias_raros.csv` — column headers in synonyms only (`Razón Social`, `Cédula RFC`, `Importe Neto`, `Vence el`, `Responsable`), some empty cells, accentuated values.
   - `desafio_3_basura_y_duplicados.csv` — leading footer rows, totals row at bottom, two duplicate RFC+concepto rows, one row with negative amount, one with future-date 2027-01-01, one row with malformed RFC.
   - Drop them under `data/archivo_ejemplo/desafios/` so they ride alongside the existing fixtures.
9. **Phase 9** — full beta flow E2E: import a challenging file → Cartera → click `Registrar pago` on one row → upload comprobante → mark paid → check `Pagos` queue → confirm audit log entry under `/logs`. Then test offline: stop the backend, refresh the PWA, confirm cached data still renders and that pending mutations queue (the abre-facil PWA offline workflow added in commit 30a9117).
10. **Phase 11** — focused tests. Minimum:
    - `cd backend && npm run test -- --runInBand --testPathPattern smart-import`
    - `cd backend && npm run test -- --runInBand --testPathPattern auth`
    - `cd frontend && npm run test -- --run src/components/audit src/components/registros`
    - Note: the only locally modified test file in last sessions was `frontend/src/components/audit/AuditTimeline.test.tsx` (per session memory of 2026-05-11). Re-confirm it passes.
11. **Phases 12-13** — commit, push, final report. Should remain a no-op until the validation phases above produce findings worth shipping (bug fixes, new fixtures, or doc updates).

## How to resume cleanly

```powershell
# 1. Free disk first — under 2 GB the run will trip the doctor warning again.
#    Suggested: clear %TEMP%\collecta-dev\*.log and %LOCALAPPDATA%\npm-cache\_logs.

# 2. Confirm services are still up; if not, re-run dev.
$h = try { (Invoke-WebRequest -UseBasicParsing http://localhost:3001/api/health -TimeoutSec 4).Content } catch { $null }
$f = try { (Invoke-WebRequest -UseBasicParsing http://localhost:5173/ -TimeoutSec 4).StatusCode } catch { $null }
if (-not $h -or -not $f) { & '.\scripts\collecta-dev.ps1' -Force }

# 3. Open the app, log in with admin / test-admin-password
#    (creds live in backend/.env.test).

# 4. Resume on /registros with Clientes_Dennise_2025.xlsx,
#    then proceed with phases 8-11.

# 5. To stop everything:
& '.\scripts\collecta-stop.ps1'
```

## Operational gotchas discovered

- **Disk**: drops fast under heavy Vite/Postgres activity. Doctor flagged it twice this session. Watch logs in `%TEMP%\collecta-dev` and `%LOCALAPPDATA%\Docker\log` between phases.
- **Docker daemon**: doctor reported `not reachable` even though TCP 5432 was up — likely Docker Desktop UI was still loading. The setup script does not block on this as long as Postgres responds via TCP.
- **Console errors**: 3 errors visible in the UI are all `https://fonts.gstatic.com/...woff2 404`. They are not regressions, just upstream Google Fonts CDN noise.
- **Smart Import preview** has 2 mappings flagged as `Media` confidence (`Tipo`, `Asesor`); both still resolved correctly on commit, but Phase 8 challenging fixtures should explicitly exercise these low-confidence cases.

## Commands worth re-running before shipping any fix

- `cd backend && npm run test:prepare` — guarantees a safe local DB.
- `cd backend && npm run lint`
- `cd frontend && npm run lint && npm run typecheck`
- `cd backend && npm run test`
- `cd frontend && npm run test`
- `pnpm` is **not** in use here; both surfaces use `npm`.
