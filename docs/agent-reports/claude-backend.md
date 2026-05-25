# Reporte — Hardening backend (Claude)

**Fecha:** 2026-05-25
**Rama:** `feat/abre-facil-saas-web`
**Alcance autorizado:** `backend/src` (excepto `smartImport*`) y tests de `auth/cors/security`.
Sin tocar frontend, n8n, docs (salvo este reporte), `.env`/secretos ni `schema.prisma`.
Sin `git add`/`commit`. Cambios dejados sin stage.

---

## 1. Cambios aplicados

### 1.1 Webhook secret: comparación en tiempo constante
**Archivo:** `backend/src/routes/webhooks.ts`

- **Antes:** `if (secret !== WEBHOOK_SECRET)` — comparación de cadenas con cortocircuito,
  expuesta teóricamente a *timing attacks* sobre el secreto del webhook.
- **Después:** helper `timingSafeEqualStr` con `crypto.timingSafeEqual` + guarda de longitud,
  más normalización del header (`string | string[] | undefined`).
- **Motivo:** consistencia con el patrón ya establecido en `middleware/auth.ts`
  (que usa `timingSafeEqual` para `API_KEY`). El webhook era el único punto de
  comparación de secretos que seguía usando `!==`.
- **Comportamiento preservado:** secreto correcto → `next()`; incorrecto/ausente → `403`.

### 1.2 Webhook 500: no filtrar `error.message` en producción
**Archivo:** `backend/src/routes/webhooks.ts`

- **Antes:** `res.status(500).json({ error: 'Error processing webhook', details: error.message })`
  — exponía detalles internos (errores de DB, cadenas de conexión, pistas de stack)
  al emisor del webhook.
- **Después:** `details` solo se incluye fuera de producción (`NODE_ENV !== 'production'`).
- **Motivo:** alinear con la política de errores de `index.ts`, que ya oculta mensajes
  internos en producción. En dev/test se mantiene `details` para depurar.

### 1.3 Test de seguridad nuevo
**Archivo:** `backend/src/__tests__/webhookSecurityHardening.test.ts` (nuevo)

Cubre ambos cambios (6 casos):
- Rechazo sin header de secreto (`403`).
- Rechazo de secreto erróneo de **igual longitud** (`403`).
- Rechazo de secreto de **distinta longitud** sin lanzar excepción (`403`).
- Aceptación del secreto exacto → procesa la petición.
- Producción: `500` sin `details` y sin filtrar la cadena sensible.
- No-producción: `500` con `details` para depuración local.

Patrón: `vi.resetModules()` + import dinámico (como `webhookSecretPolicy.test.ts`)
y mock de `../lib/prisma` para forzar el fallo de DB de forma determinista
(sin requerir base de datos real → corre en la suite unit).

---

## 2. Verificación

| Comando | Resultado |
|---|---|
| `npm run build` (tsc) | OK, sin errores |
| `npm test` (vitest unit) | **23 archivos / 117 tests OK** |
| Tests de seguridad enfocados | webhookSecurityHardening, webhookSecretPolicy, authMiddleware, authRateLimit, tokenRevocation → **30/30 OK** |

> Nota: la suite unit (`vitest.unit.config.ts`) excluye tests dependientes de DB
> (`multiTenantIsolation`, `collectionsE2E.*`, `webhookIdempotency`, etc.). No se
> ejecutó `test:full`/`test:integration` porque requieren `DATABASE_URL` de una DB
> de prueba (fuera de alcance: no se tocan secretos/entorno).

---

## 3. Hallazgos NO modificados (recomendaciones — requieren staging / fuera de fix seguro)

Estos son riesgos reales detectados durante la revisión. **No se cambiaron** porque
implican cambios de comportamiento que, según `AGENTS.md`, deben validarse primero
en respaldo/staging, o porque un fix correcto excede el alcance autorizado.

### 3.1 [ALTO] Rate limiting inefectivo detrás de proxy (Render)
- `backend/src/index.ts` no configura `app.set('trust proxy', ...)` y los limiters
  usan `validate: { xForwardedForHeader: false }`. Detrás del proxy de Render,
  `req.ip` resuelve a la IP del proxy → **todos los clientes comparten un mismo
  bucket** de rate limit (se debilita la protección y se corre riesgo de bloqueo
  global). El limiter en memoria de `middleware/rateLimit.ts` (login/verify) tiene
  el mismo problema.
- **Recomendación:** habilitar `trust proxy` (idealmente vía env, p. ej.
  `TRUST_PROXY`, con default conservador) y reactivar la validación de
  `X-Forwarded-For`. Validar en staging que el conteo de rate limit es por cliente.

### 3.2 [ALTO] Colapso multi-tenant para principals de Supabase
- `services/authProvider.ts → verifyProviderToken` devuelve el principal **sin
  `organizationId`**. Como `lib/tenant.ts → requireOrg` cae a
  `DEFAULT_ORGANIZATION_ID = 'default'`, **todo usuario autenticado vía Supabase
  opera sobre el tenant `'default'`** → fuga/cruce de datos entre organizaciones si
  el proveedor Supabase se habilita en producción.
- Mitigante actual: el flujo real de login es local (DB + password con `organizationId`),
  así que el camino Supabase puede estar latente. Aun así es un riesgo serio.
- **Recomendación:** mapear el usuario Supabase a su organización (requiere lógica de
  producto y posiblemente `schema.prisma`, ambos fuera de alcance). Mientras tanto,
  considerar **fallar cerrado** en vez de colapsar a `'default'` para principals sin
  `organizationId` — validar impacto en staging antes de aplicar.

### 3.3 [MEDIO] Fuga de `error.message` en ruta PDF de cobranza
- `backend/src/routes/cobranza.ts` (ruta `/cliente/:rfc/pdf`) responde
  `details: (error as Error).message` en el `500`. Ruta autenticada (exposición
  menor), pero inconsistente con la política de producción.
- **Recomendación:** mismo tratamiento que el webhook (ocultar `details` en prod).
  No se aplicó para no ampliar el diff a un archivo de ruta grande ni mezclar cambios.

### 3.4 [BAJO] Ternario muerto en `/api/auth/verify`
- `routes/auth.ts`: `authSource: decoded.authSource === 'local' ? 'local' : 'local'`
  siempre evalúa a `'local'`. Code smell, sin impacto de seguridad. Limpieza opcional.

---

## 4. Verificación de superficie (sin cambios necesarios)

- **Ruta pública `/api/cobranza/media/:token`** (sin auth): segura ante *path traversal*.
  El `token` es solo clave de un `Map` en memoria; el `filePath` servido se construyó
  en el servidor a partir de `crypto.randomBytes(24)` y `Content-Disposition` usa
  `path.basename`. No hay entrada de usuario en la ruta de archivo.
- **`middleware/auth.ts`**: validación de longitud de `JWT_SECRET`, blocklist de `jti`,
  `timingSafeEqual` para `API_KEY` y gating de rol en `requireAdminConfirm` ya presentes
  (Bugs 9/10/11 previos). Sin cambios.

---

## 5. Bloqueos

- Ninguno técnico. Build y suite unit en verde.
- No se ejecutaron tests de integración/E2E con DB por no disponer de `DATABASE_URL`
  de prueba dentro del alcance (no se tocan secretos/entorno).

## 6. Archivos tocados (sin stage)

- `backend/src/routes/webhooks.ts` (modificado)
- `backend/src/__tests__/webhookSecurityHardening.test.ts` (nuevo)

> Cambios ajenos detectados en el árbol de trabajo (smartImport, frontend) **no fueron
> tocados**, conforme a la instrucción de respetarlos.
