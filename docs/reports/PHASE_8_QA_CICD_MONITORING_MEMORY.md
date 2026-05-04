# Phase 8 Memory - QA, CI/CD, Monitoring

## 2026-05-04 - Avance 1: orientacion

- Workspace real localizado en `C:\Users\LENOVO\Documents\COLLECTA`; el cwd inicial `C:\Users\LENOVO\Documents\New project` solo contiene memorias previas y un git sin commits.
- Stack confirmado desde `AGENTS.md` y package files:
  - Backend: Express 5, TypeScript, Prisma, Vitest, Supertest.
  - Frontend: React 19, TypeScript, Vite, Vitest.
  - Deploy objetivo: Vercel para frontend, Railway para backend.
  - Automatizacion: n8n; WhatsApp via Evolution API self-host o fallback `wa.me`.
- Scripts existentes:
  - Backend: `npm test`, `npm run build`.
  - Frontend: `npm test`, `npm run build`, `npm run lint`.
- Rutas relevantes localizadas:
  - `/api/auth/login`, `/api/auth/verify`.
  - `/api/clients`.
  - `/api/operations`.
  - `/api/import/batch`.
  - `/api/n8n/daily-report`, `/api/n8n/pending-collections`, `/api/n8n/webhook/payment-confirmed`.
  - `/api/whatsapp/status`.
  - `/api/health`.
- Estado git antes de Phase 8: hay cambios previos en `backend/src/__tests__/test-app.ts`, `frontend/package.json`, `frontend/package-lock.json` y archivos sin versionar de fases anteriores. No se revertiran ni mezclaran innecesariamente.
- Siguiente avance: agregar smoke tests backend de Phase 8 usando contratos existentes y montar rutas faltantes solo dentro del test app.

## 2026-05-04 - Avance 2: smoke tests y soporte minimo

- Se acoto `backend/vitest.config.ts` para ejecutar solo `src/**/*.test.ts` y excluir `dist/**`, evitando que CI corra artefactos compilados.
- Se extendio `backend/src/__tests__/test-app.ts` con rutas necesarias para QA:
  - `/api/auth`
  - `/api/import`
  - rutas n8n, WhatsApp y webhooks ya agregadas por avance previo del workspace.
- Se agrego `backend/src/__tests__/phase8.smoke.test.ts` con smoke checks de:
  - login JWT y verify.
  - clients protegidos.
  - operations protegidas.
  - import analyze/commit via `/api/import/batch` con provider `regex`.
  - n8n protected route.
  - WhatsApp status sin Evolution API configurada.
- Se agrego `backend/src/services/paymentDetection.ts` para satisfacer los tests existentes de deteccion de pagos y exponer una base monitoreable de confianza por logs.
- Se ajusto `backend/src/routes/whatsapp.ts` para:
  - no filtrar detalles sensibles de errores Evolution en `/status`.
  - bloquear envios a clientes suspendidos salvo override explicito, registrando `WhatsAppMessage` y `LogEntry`.
- Siguiente avance: agregar workflow CI y documentacion operativa de produccion/monitoreo.

## 2026-05-04 - Avance 3: CI workflow

- Se agrego `.github/workflows/ci.yml`.
- Job backend:
  - usa Node 20.
  - instala con `npm ci`.
  - levanta PostgreSQL 16 como servicio.
  - define `DATABASE_URL`, `DIRECT_URL`, `API_KEY`, `JWT_SECRET`, `ADMIN_USER`, `ADMIN_PASS`.
  - ejecuta `npx prisma generate`, `npx prisma db push --skip-generate`, `npm run build`, `npm test`.
- Job frontend:
  - usa Node 20.
  - instala con `npm ci`.
  - ejecuta `npm test` solo si existen tests frontend.
  - ejecuta siempre `npm run build`.
- Siguiente avance: crear QA checklist, deployment runbook y monitoring/incident doc.

## 2026-05-04 - Avance 4: documentacion y deploy config

- Se agrego `docs/reports/PHASE_8_QA_CHECKLIST.md` con gates CI, smoke coverage, readiness prod y smoke manual de release.
- Se agrego `docs/reports/PHASE_8_DEPLOYMENT_RUNBOOK.md` con pasos de fresh clone, backend Railway, frontend Vercel, n8n y rollback.
- Se agrego `docs/reports/PHASE_8_MONITORING_AND_INCIDENTS.md` con senales, alertas y playbooks para API, n8n, WhatsApp, imports y payment detection.
- Se agrego `backend/railway.json` con build/start commands, migraciones y healthcheck `/api/health`.
- Se agrego migracion `backend/prisma/migrations/20260504233000_add_whatsapp_and_agent_tables/migration.sql` para alinear `prisma migrate deploy` con las tablas ya definidas en `schema.prisma`.
- Siguiente avance: ejecutar verificacion local y registrar resultados/bloqueos.

## 2026-05-04 - Avance 5: verificacion

- `backend`: `npm run build` paso correctamente.
- `frontend`: `npm run build` paso correctamente. Vite reporto solo advertencia de chunk grande.
- `frontend`: `npm test` paso con 7 archivos y 19 tests.
- `backend`: `npx prisma validate` paso correctamente al definir `DATABASE_URL` y `DIRECT_URL` dummy.
- `backend`: `npm test` ya no intenta ejecutar `dist/**` ni falla por modulo `paymentDetection` faltante.
- Bloqueo local real: `npm test` backend no puede completar porque no hay PostgreSQL escuchando en `localhost:5432` y Docker daemon no esta corriendo. El workflow CI agregado si levanta PostgreSQL 16 y ejecuta `prisma db push` antes de tests.
- Se ajusto `backend/src/__tests__/setup.ts` para definir env vars de test antes de importar rutas y usar un `PrismaClient` limpio para setup/cleanup, evitando interferencia de mocks de Vitest.
