# Session B - Auth Hardening Results

Fecha: 2026-05-13
Branch: `codex/plan07-auth-hardening`

## Bugs Cerrados

| Bug | Archivo(s) | Estado |
|-----|-----------|--------|
| 7 - Rate limit login | `backend/src/middleware/rateLimit.ts` (nuevo), `backend/src/routes/auth.ts` | ✅ |
| 8 - Rate limit verify | `backend/src/middleware/rateLimit.ts`, `backend/src/routes/auth.ts` | ✅ |
| 9 - JWT_SECRET corto silencioso | `backend/src/middleware/auth.ts` | ✅ |
| 10 - JWT sin revocacion | `backend/src/services/tokenRevocation.ts` (nuevo), `backend/src/routes/auth.ts`, `backend/src/middleware/auth.ts` | ✅ |
| 11 - requireAdminConfirm sin rol | `backend/src/middleware/auth.ts` | ✅ |
| 12 - Login hardcodea admin | `backend/src/routes/auth.ts` (comentario) | ✅ |
| 13 - (req as any).user | `backend/src/types/express.d.ts` (nuevo) | ✅ |

## Tests Nuevos

| Archivo | Tests |
|---------|-------|
| `backend/src/__tests__/authRateLimit.test.ts` | 4 tests: login 429 tras 5 fails, reset despues de clear, login exitoso, verify 429 tras 60 hits |
| `backend/src/__tests__/tokenRevocation.test.ts` | 6 tests: servicio (unknown/revoke/null/TTL) + E2E (logout bloquea, token invalido responde 200) |

## Archivos Creados

- `backend/src/middleware/rateLimit.ts` — limiter in-memory por IP+path con ventana configurable, Retry-After header, `clearRateLimitBuckets()` para tests
- `backend/src/services/tokenRevocation.ts` — blocklist in-memory con `revokeJti`/`isRevoked`/`clearAllRevocations`, auto-expiracion de entradas vencidas
- `backend/src/types/express.d.ts` — augment global `Express.Request` con `user?: AuthenticatedPrincipal`
- `backend/src/__tests__/authRateLimit.test.ts`
- `backend/src/__tests__/tokenRevocation.test.ts`

## Archivos Modificados

- `backend/src/routes/auth.ts` — importa `createRateLimiter`, `revokeJti`; agrega `loginRateLimiter` (5/15min), `verifyRateLimiter` (60/1min), endpoint `POST /api/auth/logout` que extrae jti y lo revoca; comment Bug 12
- `backend/src/middleware/auth.ts` — Bug 9: valida `JWT_SECRET.length < 32` y responde 500; Bug 10: llama `isRevoked(decoded.jti)` si existe jti; Bug 11: verifica `principal.role !== 'admin'` antes de chequear header; usa `req.user` tipado

## Verificacion

```powershell
cd backend
npm run build                              # PASS
npm run test:full                          # 26 files / 121 tests PASS

cd ..\frontend
npm run build                              # PASS (chunk warning pre-existente)
npm test                                   # 47 files / 148 tests PASS, 2 skipped
```

### Baseline vs Actual

| Medida | Baseline (Plan 07) | Ahora |
|--------|-------------------|-------|
| Backend test files | 24 | 26 |
| Backend tests | 106 | 121 |
| Frontend test files | 47 | 47 |
| Frontend tests | 147 | 148 (+2 skipped) |

## Limitaciones Documentadas

- **Rate limiter in-memory**: `Map<string, Bucket>` sin LRU ni persistencia. Multi-replica requiere Redis INCR+EXPIRE.
- **Revocacion in-memory**: `Set<string>` por instancia. Token revocado en replica A sigue siendo valido en replica B hasta expirar. No implementado en esta ronda.
- **Login hardcodea admin**: Single-tenant, usuario y password via `.env` (`ADMIN_USER`/`ADMIN_PASS`). Sin tabla de usuarios, sin password hashing. Documentado como TODO en `AUTH_PLATFORM_DECISION_RECORD.md`.

## Riesgos Residuales

- Si `JWT_SECRET` se cambia en produccion, todos los tokens existentes se invalidan (jti no migran).
- `express-rate-limit` (dependencia externa en `backend/package.json`) se usa para el global limiter en `index.ts`, mientras que el rate limit de auth usa el `createRateLimiter` local sin dependencias. Consistencia: no hay conflicto.
- `(req as any).user` sobrevive en `cobranza.ts` y `agent.ts` (archivos de Sesion A/Sesion C, no tocados por este brief).

## Contrato de Integracion

- `requireAdminConfirm` ahora exige `principal.role === 'admin'` antes del header check.
- Sesion A y Sesion C pueden usar `requireAdminConfirm` en sus rutas directamente.
