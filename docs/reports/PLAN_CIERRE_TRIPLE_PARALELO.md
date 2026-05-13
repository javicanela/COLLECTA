# Plan de Cierre - Tres Sesiones Paralelas (Plan 06 / 07 / 08)

Fecha: 2026-05-13
Rama base: `codex/plan07-auth-platform-persistence`
Commit base: `781d36f`

## Proposito

Cerrar los planes 06, 07 y 08 parchando bugs y gaps funcionales reales que
quedaron sin identificar en las pasadas previas. No tocar capa visual ni
componentes de UI salvo donde sea estrictamente necesario para exponer una
funcionalidad. Foco: backend, integraciones, scripts, contratos.

## Estado real al cierre de pasadas previas

| Plan | Estado |
|------|--------|
| 06   | Tests automatizados PASS. QA navegador con limitacion (upload manual). WhatsApp real NOT RUN. Worktree quedo con cambios ajenos. |
| 07   | Tests automatizados PASS. Provider Supabase con adapter listo pero sin proyecto real. Sin rate limiting, sin revocacion de JWT, sin RBAC fino. |
| 08   | Scripts creados. Verificacion automatizada PENDIENTE. Falta `assert-safe-test-db.ts` y `seed-demo-data.ts` mencionados en el plan. |

## Bugs y gaps funcionales identificados

Lista detallada con ubicacion exacta. Cada uno se asigna a una sola sesion.

### Plan 06 / Cobranza

1. **Webhook sin idempotencia por mensaje** (`backend/src/routes/webhooks.ts:81-92`).
   `prisma.whatsAppMessage.create` no deduplica por `evolutionMsgId`. Si Evolution
   reintenta, insertamos filas duplicadas y la correlacion vuelve a correr.
2. **Parser de monto vulnerable a tokens parecidos a fecha**
   (`backend/src/services/paymentDetection.ts:80-87`).
   `parseAmountFromText` toma el primer numero. Texto tipo `"08/10/2026 ya pague 1500"`
   captura `8`, no `1500`.
3. **Sin ventana temporal en `previousOutbound`**
   (`backend/src/services/paymentDetection.ts:347-354`).
   Un mensaje saliente de hace 6 meses correlaciona un "ya pague" no relacionado.
4. **No se actualiza el `WhatsAppMessage` entrante con el resultado de correlacion**.
   La auditoria queda en `LogEntry`, pero el registro de mensaje queda en `RECEIVED`
   aun cuando se marco PAGADO.
5. **`WEBHOOK_SECRET=""` silencia la verificacion sin warning**
   (`backend/src/routes/webhooks.ts:13-17`). En dev esta bien, pero produccion lo
   necesita ruidoso.
6. **`AuditTimeline.test.tsx` se relleno solo para desbloquear CI**
   (commit `781d36f`). Las aserciones probablemente son superficiales.

### Plan 07 / Auth

7. **Sin rate limit en `/api/auth/login`** (`backend/src/routes/auth.ts:54-89`).
   Brute force trivial contra ADMIN_USER/ADMIN_PASS.
8. **Sin rate limit en `/api/auth/verify`** (`backend/src/routes/auth.ts:91-137`).
9. **`JWT_SECRET` corto silencioso en middleware**
   (`backend/src/middleware/auth.ts:46`). Si `JWT_SECRET.length < 32`, salta JWT
   y cae a API_KEY sin error explicito.
10. **JWT sin revocacion**. `/api/auth/login` emite token 24h sin `jti` ni
    blocklist. Logout no invalida realmente.
11. **`requireAdminConfirm` no valida rol** (`backend/src/middleware/auth.ts:90-97`).
    Solo revisa header `X-Admin-Confirm`. Un `asesor` que conozca el header
    pasa la guardia.
12. **Login hardcodea rol admin** (`backend/src/routes/auth.ts:74-77`). Sin
    multi-usuario real. Aceptable para esta iteracion, pero documentar.
13. **`(req as any).user`** (varios) viola la regla de TS de no usar `any`.

### Plan 08 / Ops

14. **`collecta-doctor.ps1` no prueba conectividad real a Postgres**
    (revisa el contenedor pero no abre socket a `127.0.0.1:5432`).
15. **`collecta-doctor.ps1` no avisa de `.env.test` faltante**.
16. **`collecta-dev.ps1` falla si el puerto esta ocupado**, sin opcion `-Force`
    para matar PIDs previos.
17. **`collecta-dev.ps1` no espera a que el backend este listo** antes de
    declarar URLs disponibles.
18. **Falta `backend/scripts/assert-safe-test-db.ts`** mencionado en Plan 08
    como guard contra DB de produccion.
19. **Falta `backend/scripts/seed-demo-data.ts`** mencionado en Plan 08 como
    fuente de datos demo idempotentes.
20. **`docs/reports/INSTALLATION_OPERATIONS_QA_RESULTS.md` esta en stub**
    ("Pendiente de completar").
21. **No hay `collecta-stop.ps1`** complementario a `collecta-dev.ps1`.

## Asignacion por sesion

### Sesion A - Plan 06 Hardening
- Rama: `codex/plan06-cobranza-hardening`
- Brief: `docs/reports/SESSION_A_PLAN06_COBRANZA_HARDENING.md`
- Bugs: 1, 2, 3, 4, 5, 6
- Archivos exclusivos:
  - `backend/src/routes/webhooks.ts`
  - `backend/src/services/paymentDetection.ts`
  - `backend/src/__tests__/paymentConfirmationCorrelation.test.ts`
  - `backend/src/__tests__/webhookIdempotency.test.ts` (nuevo)
  - `frontend/src/components/audit/AuditTimeline.test.tsx`

### Sesion B - Plan 07 Hardening
- Rama: `codex/plan07-auth-hardening`
- Brief: `docs/reports/SESSION_B_PLAN07_AUTH_HARDENING.md`
- Bugs: 7, 8, 9, 10, 11, 12, 13
- Archivos exclusivos:
  - `backend/src/routes/auth.ts`
  - `backend/src/middleware/auth.ts`
  - `backend/src/middleware/rateLimit.ts` (nuevo)
  - `backend/src/services/tokenRevocation.ts` (nuevo)
  - `backend/src/__tests__/auth.test.ts`
  - `backend/src/__tests__/authMiddleware.test.ts`
  - `backend/src/__tests__/authRateLimit.test.ts` (nuevo)
- Coordinacion: Sesion B es la unica que toca `middleware/auth.ts` y
  `routes/auth.ts`. Si Sesion A o C necesitan un nuevo principal o requerir admin,
  esperan a que Sesion B publique.

### Sesion C - Plan 08 Hardening
- Rama: `codex/plan08-ops-hardening`
- Brief: `docs/reports/SESSION_C_PLAN08_OPS_HARDENING.md`
- Bugs: 14, 15, 16, 17, 18, 19, 20, 21
- Archivos exclusivos:
  - `scripts/collecta-doctor.ps1`
  - `scripts/collecta-dev.ps1`
  - `scripts/collecta-test.ps1`
  - `scripts/collecta-stop.ps1` (nuevo)
  - `backend/scripts/assert-safe-test-db.ts` (nuevo)
  - `backend/scripts/seed-demo-data.ts` (nuevo)
  - `backend/src/__tests__/safeTestDbGuard.test.ts` (nuevo)
  - `docs/reports/INSTALLATION_OPERATIONS_QA_RESULTS.md`
  - `docs/runbooks/SEED_DEMO_DATA.md` (nuevo si aplica)

## Archivos compartidos / reglas de integracion

| Archivo | Quien puede tocarlo | Razon |
|---------|---------------------|-------|
| `backend/src/index.ts` | Solo Sesion B y solo si registra `rateLimit` o `tokenRevocation` | Ya esta sobrecargado; minimizar conflictos |
| `backend/prisma/schema.prisma` | Nadie | No se modifica en esta ronda |
| `backend/package.json` | Solo Sesion B (si agrega `express-rate-limit`) y Sesion C (si agrega `tsx` para scripts) | Coordinar pull |
| `backend/src/middleware/auth.ts` | Solo Sesion B | Bugs 9, 10, 11, 13 viven aqui |
| `frontend/src/components/audit/AuditTimeline.test.tsx` | Solo Sesion A | Es test de evidencia de cobranza |

Politica de PR/commit: ninguna sesion hace push ni abre PR sin confirmacion
explicita del usuario.

## Setup de worktrees recomendado

```powershell
# Desde la raiz del repo
git worktree add ..\collecta-A-cobranza-hardening -b codex/plan06-cobranza-hardening
git worktree add ..\collecta-B-auth-hardening      -b codex/plan07-auth-hardening
git worktree add ..\collecta-C-ops-hardening       -b codex/plan08-ops-hardening
```

Cada sesion arranca con `cd` al worktree correspondiente y solo opera ahi.
`.worktrees/` no se usa porque podria gitignorearse de forma distinta entre
ramas; preferir directorio hermano.

## Referencias locales a aprovechar

Cada brief especifica las suyas, pero baseline:

- `~/skills/nodebestpractices/sections/security/` para rate limit, JWT, secret
  management.
- `~/skills/nodebestpractices/sections/production/` para idempotencia,
  health checks, logging.
- `~/skills/30-seconds-of-code/content/snippets/js/` para utilidades de
  texto, throttle, debounce.
- `~/skills/n8n/packages/nodes-base/nodes/` para patrones de webhooks
  reales.
- `~/skills/quick-SQL-cheatsheet/` para queries de seed.

## Criterio de exito conjunto

Todos:

1. `cd backend; npm run build` PASS en cada rama.
2. `cd backend; npm run test:full` PASS en cada rama.
3. `cd frontend; npm run build` PASS en cada rama.
4. `cd frontend; npm test` PASS en cada rama.
5. Cada brief especifica criterios extra propios.
6. Cada brief produce un `*_HARDENING_RESULTS.md` en `docs/reports/` antes
   de declarar cierre.

## Orden sugerido de integracion final

Cuando las 3 ramas pasen tests:

1. Merge `codex/plan08-ops-hardening` primero (es el menos invasivo,
   tooling y scripts).
2. Merge `codex/plan07-auth-hardening` segundo (cambia middleware; debe
   correr en main antes de cobranza nueva).
3. Merge `codex/plan06-cobranza-hardening` ultimo (depende de middleware
   estable y de `seed-demo-data.ts` opcional).

La integracion final no es parte de esta planeacion. Se hace solo bajo
peticion explicita del usuario.
