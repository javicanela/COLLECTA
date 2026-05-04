# Phase 4 WhatsApp Evolution Memory

## Avance 1 - Orientacion

Fecha: 2026-05-04

- El `cwd` inicial `C:\Users\LENOVO\Documents\New project` solo contenia `.git`.
- El repo operativo real para Phase 4 esta en `C:\Users\LENOVO\Documents\COLLECTA`.
- Stack validado: backend Express 5 + Prisma + Vitest; frontend React 19 + Vite.
- Archivos principales leidos: `docs/specs/whatsapp-evolution-api.md`,
  `backend/src/services/evolutionApi.ts`, `backend/src/routes/whatsapp.ts`,
  `backend/src/routes/webhooks.ts`, `frontend/src/utils/whatsapp.ts`,
  `frontend/src/components/MainLayout.tsx` y `backend/prisma/schema.prisma`.

## Avance 2 - Contrato y TDD

- Se agrego suite unitaria `backend/src/__tests__/whatsapp.test.ts` con Prisma y
  Evolution API simulados para evitar dependencia de `DATABASE_URL`.
- RED inicial:
  - `/api/whatsapp/status` exponia detalles del error de conexion.
  - `/api/whatsapp/send` permitia cliente `SUSPENDIDO`.
- El comando DB-integrado `npm test -- src/__tests__/whatsapp.test.ts` sigue
  bloqueado si no existe `DATABASE_URL`, consistente con memorias previas.

## Avance 3 - Backend

- `GET /api/whatsapp/status` ahora responde `connection_check_failed` sin filtrar
  detalles internos.
- `/send` y `/send-media` tienen rate limit saliente.
- Clientes `SUSPENDIDO` se bloquean salvo `overrideSuspendedClient: true`.
- Intentos bloqueados, fallidos y exitosos escriben `WhatsAppMessage` y
  `LogEntry`.
- Evolution no configurado registra intento fallido y responde con fallback
  manual.

## Avance 4 - Frontend y spec

- El indicador lateral WhatsApp ahora distingue `Conectado`, `Desconectado`,
  `No config.` y `Error`.
- El fallback manual `wa.me` se preserva en dashboard y modal masivo.
- La spec operacional documenta infra self-host, costos reales, licencia,
  variables, rate limit y politica de suspendidos.

## Verificacion parcial

- `npx vitest run --config vitest.whatsapp.config.ts src/__tests__/whatsapp.test.ts`
  paso con 6 tests.

