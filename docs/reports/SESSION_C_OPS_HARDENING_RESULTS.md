# Session C - Ops Hardening Results

Rama: `codex/plan08-ops-hardening`
Fecha: 2026-05-13

## Bugs cerrados

- [x] **Bug 14** - `collecta-doctor.ps1`: agrega `Test-TcpReachable` para conectividad Postgres real via TCP a 127.0.0.1:5432.
- [x] **Bug 15** - `collecta-doctor.ps1`: verifica existencia de `backend/.env.test` y valida claves requeridas.
- [x] **Bug 16** - `collecta-dev.ps1`: agrega parametro `-Force` que mata PIDs previos desde el pidFile antes de arrancar.
- [x] **Bug 17** - `collecta-dev.ps1`: agrega `Wait-HttpReady` que hace poll de `/api/health` hasta 30s antes de arrancar frontend.
- [x] **Bug 18** - Creado `backend/scripts/assert-safe-test-db.ts` con `evaluateTestDbSafety()` exportada pura desde `backend/src/lib/dbSafety.ts` + test `safeTestDbGuard.test.ts` (10 casos).
- [x] **Bug 19** - Creado `backend/scripts/seed-demo-data.ts` (idempotente, 10 clientes + 10 operaciones via upsert, valida DB safety antes de ejecutar).
- [x] **Bug 20** - Actualizado `docs/reports/INSTALLATION_OPERATIONS_QA_RESULTS.md` con tabla de verificacion.
- [x] **Bug 21** - Creado `scripts/collecta-stop.ps1` (lee pidFile, mata procesos, limpia).

## Commands ejecutados

| Comando | Resultado |
|---|---|
| `cd backend; npm run build` | PASS |
| `cd backend; npm run test:full` | PASS - 28 files, 136 tests |
| `npm run db:guard` | PASS - "DB segura para operaciones destructivas locales" |
| `npm run db:seed` | PASS - "10 clientes y 10 operaciones demo upserted" |
| `npx ts-node scripts/assert-safe-test-db.ts` (sin .env) | PASS - aborta con DATABASE_URL vacio |

## Diff resumido

| Archivo | Tipo de cambio |
|---|---|
| `scripts/collecta-doctor.ps1` | Edit: agrega `Test-TcpReachable`, chequeo `.env.test` |
| `scripts/collecta-dev.ps1` | Edit: agrega `-Force`, `Wait-HttpReady`, readiness check |
| `scripts/collecta-stop.ps1` | Nuevo: mata procesos del pidFile |
| `backend/scripts/assert-safe-test-db.ts` | Nuevo: guard de seguridad para DB |
| `backend/scripts/seed-demo-data.ts` | Nuevo: seed idempotente |
| `backend/src/lib/dbSafety.ts` | Nuevo: funcion `evaluateTestDbSafety` exportable |
| `backend/src/__tests__/safeTestDbGuard.test.ts` | Nuevo: 10 tests de seguridad |
| `backend/package.json` | Edit: agrega scripts `db:guard` y `db:seed` con env-file |
| `docs/reports/INSTALLATION_OPERATIONS_QA_RESULTS.md` | Edit: tabla de verificacion con resultados reales |

## Completamente funcional: definicion y estado

**Definicion:** Session C esta completamente funcional cuando:

1. `npm run build` → PASS ✅
2. `npm run test:full` → PASS ✅
3. `npm run db:guard` → PASS ✅
4. `npm run db:seed` → PASS, datos visibles en DB ✅
5. `.\scripts\collecta-doctor.ps1` → PASS sin errores ❌ PENDIENTE
6. `.\scripts\collecta-dev.ps1 -Force` → backend + frontend arrancan, health check pasa ❌ PENDIENTE
7. `.\scripts\collecta-test.ps1` → build + tests PASS ❌ PENDIENTE
8. `.\scripts\collecta-stop.ps1` → mata procesos limpio ❌ PENDIENTE

Items 1-4: **VERIFICADO**.
Items 5-8: requieren ejecucion manual en PowerShell con Docker + DB + `.env.test`. No hay CI que lo automatice.

**La session esta funcional al 100% en backend/scripts y npm targets. Los PowerShell scripts estan implementados y listos pero no ejecutados por falta de entorno PowerShell completo.**

## Riesgos residuales

1. Los scripts PowerShell no han sido ejecutados ni validados en runtime. La sintaxis es correcta pero requieren prueba manual.
2. `seed-demo-data.ts` usa IDs fijos (`seed-op-DEMO*`). Segunda ejecucion hace upsert correctamente (idempotente). No hay riesgo de duplicados.
3. Los scripts `db:guard` y `db:seed` requieren `.env.test` presente. Sin el, abortan con mensaje claro.
