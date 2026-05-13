# Session B - Plan 07 Auth Hardening Brief

## Contexto en frio

Eres una sesion paralela de Claude Code (de 3). Tu sola responsabilidad es
endurecer la capa de autenticacion creada por Plan 07 (rate limiting,
revocacion JWT, RBAC fino).
NO toques cobranza, webhooks ni paymentDetection: la Sesion A los posee.
NO toques scripts: la Sesion C los posee.

Antes de empezar:

1. Lee `AGENTS.md`.
2. Lee `docs/reports/PLAN_CIERRE_TRIPLE_PARALELO.md`.
3. Lee `docs/reports/AGENT_HANDOFF_PLAN_07_AUTH_PLATFORM_PERSISTENCE.md`.
4. Lee `docs/reports/AUTH_PLATFORM_QA_RESULTS.md`.
5. Lee `docs/reports/AUTH_PLATFORM_DECISION_RECORD.md`.

## Rama y worktree

```powershell
git worktree add ..\collecta-B-auth-hardening -b codex/plan07-auth-hardening
cd ..\collecta-B-auth-hardening
```

## Archivos exclusivos (solo tu)

- `backend/src/routes/auth.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/middleware/rateLimit.ts` (nuevo)
- `backend/src/services/tokenRevocation.ts` (nuevo)
- `backend/src/__tests__/auth.test.ts`
- `backend/src/__tests__/authMiddleware.test.ts`
- `backend/src/__tests__/authRateLimit.test.ts` (nuevo)
- `backend/src/__tests__/tokenRevocation.test.ts` (nuevo)

Posiblemente:
- `backend/src/index.ts` SOLO para registrar `rateLimit` global o local.
- `backend/package.json` SOLO si decides agregar `express-rate-limit`.

## Bugs a parchar

### Bug 7 - Rate limit en /api/auth/login

Crear `backend/src/middleware/rateLimit.ts` con un limiter de memoria
ligero (no agregar dependencia si puedes evitarlo). Patron sugerido:

```ts
type Bucket = { hits: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function createRateLimiter(opts: { windowMs: number; max: number; key?: (req) => string }) {
  return (req, res, next) => {
    const key = (opts.key?.(req)) || `${req.ip}:${req.path}`;
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || b.resetAt < now) {
      buckets.set(key, { hits: 1, resetAt: now + opts.windowMs });
      return next();
    }
    b.hits += 1;
    if (b.hits > opts.max) {
      const retryAfter = Math.ceil((b.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Demasiados intentos. Reintenta luego.' });
    }
    next();
  };
}
```

Aplicar a `/api/auth/login`: 5 intentos / 15 min por IP.

Si prefieres dependencia probada, agrega `express-rate-limit` a
`backend/package.json` y documentalo. NodeBestPractices recomienda esto:
ver `~/skills/nodebestpractices/sections/security/limitrequests.md`.

Test en `authRateLimit.test.ts`: 5 POST con credenciales malas =>
401, sexto POST => 429 con `Retry-After`.

### Bug 8 - Rate limit en /api/auth/verify

Mismo limiter, ventana corta:
- 60 intentos / minuto por IP en `/api/auth/verify`.

Test analogo.

### Bug 9 - JWT_SECRET corto silencioso
Archivo: `backend/src/middleware/auth.ts:46`

Cambia el comportamiento:

```ts
if (JWT_SECRET) {
  if (JWT_SECRET.length < 32) {
    res.status(500).json({ error: 'JWT_SECRET configurado pero invalido (min 32 chars)' });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { ... };
    // ...
  } catch {
    // Continuar con API_KEY / provider check.
  }
}
```

Test: setear `JWT_SECRET='short'`, enviar Bearer cualquier-cosa =>
500 con mensaje legible (sin echo del secreto).

### Bug 10 - JWT sin revocacion
Crear `backend/src/services/tokenRevocation.ts`:

```ts
const revoked = new Set<string>();
const TTL_MS = 24 * 3600 * 1000;
const expiry = new Map<string, number>();

export function revokeJti(jti: string) {
  revoked.add(jti);
  expiry.set(jti, Date.now() + TTL_MS);
}

export function isRevoked(jti: string): boolean {
  const exp = expiry.get(jti);
  if (exp && exp < Date.now()) {
    revoked.delete(jti);
    expiry.delete(jti);
    return false;
  }
  return revoked.has(jti);
}

export function clearAllRevocations() {
  revoked.clear();
  expiry.clear();
}
```

En `routes/auth.ts`:

1. Al firmar token en `/login`, agrega `jti: crypto.randomUUID()`.
2. Agrega endpoint `POST /api/auth/logout` que decodifica el bearer, llama
   `revokeJti(decoded.jti)` y responde `{ revoked: true }`.

En `middleware/auth.ts`, despues de `jwt.verify`, llama `isRevoked(decoded.jti)`
y rechaza con 401 si esta revocado.

Test:
- login => obtiene token, hit a ruta protegida => 200.
- logout con ese token => 200.
- mismo token a ruta protegida => 401.

Nota: `Set` en memoria no es multi-instancia. Documentar en el resultado
que para multi-replica hace falta Redis u otro store. NO implementar Redis
ahora.

### Bug 11 - requireAdminConfirm sin chequeo de rol
Archivo: `backend/src/middleware/auth.ts:90-97`

```ts
export function requireAdminConfirm(req: Request, res: Response, next: NextFunction) {
  const principal = (req as any).user as AuthenticatedPrincipal | undefined;
  if (!principal || principal.role !== 'admin') {
    res.status(403).json({ error: 'Se requiere rol admin' });
    return;
  }
  const confirmHeader = req.headers['x-admin-confirm'];
  if (confirmHeader !== 'yes-delete-all') {
    res.status(403).json({ error: 'Se requiere X-Admin-Confirm: yes-delete-all' });
    return;
  }
  next();
}
```

Test: principal con `role: 'asesor'` + header correcto => 403 con mensaje
de rol. Principal admin sin header => 403 con mensaje de header.

### Bug 12 - Login hardcodea rol admin
Archivo: `backend/src/routes/auth.ts:74-77`

NO refactorizar a multi-usuario en esta ronda. Solo agregar comentario
explicando el limite y documentar en `AUTH_PLATFORM_DECISION_RECORD.md` el
TODO. Si Plan 07 ya documento esto, solo referenciar.

### Bug 13 - Eliminar (req as any).user
Crear o ampliar `backend/src/types/express.d.ts`:

```ts
import { AuthenticatedPrincipal } from '../services/authTypes';
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedPrincipal;
    }
  }
}
export {};
```

Reemplaza todos los `(req as any).user` por `req.user` en archivos exclusivos.
Si tsconfig no incluye el `.d.ts`, agregalo via `include` (no toques otros
archivos compartidos).

## Verificacion

```powershell
cd backend
npm run build
npm run test:full

cd ..\frontend
npm run build
npm test
```

Esperado: PASS.

Adicional manual:

```powershell
# Login fail x6
1..6 | ForEach-Object {
  curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{\"email\":\"admin@collecta.local\",\"password\":\"wrong\"}'
}
# Sexto debe devolver 429
```

## Entregable

`docs/reports/SESSION_B_AUTH_HARDENING_RESULTS.md` con:

- Bugs cerrados y diferidos.
- Resultado de tests.
- Diff resumido.
- Notas sobre limitaciones (revocacion in-memory, multi-instancia).

## Reglas

- No tocar `.env`.
- No commit/push sin pedido.
- No tocar cobranza ni webhooks ni paymentDetection.
- No tocar scripts/* ni backend/scripts/*.
- Si Sesion A o C necesitan tu nuevo `requireAdminConfirm`, esperan a que
  publiques esta rama; documenta el contrato en el RESULTS.

## Referencias

- `~/skills/nodebestpractices/sections/security/limitrequests.md`
- `~/skills/nodebestpractices/sections/security/jwt-blacklisting.md` (si existe)
- `~/skills/30-seconds-of-code/content/snippets/js/s/throttle.md`
- Spec local: `backend/src/services/authTypes.ts`
