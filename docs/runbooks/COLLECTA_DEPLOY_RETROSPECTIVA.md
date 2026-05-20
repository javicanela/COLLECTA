# Despliegue Collecta SaaS — Retrospectiva, Obstáculos y Lecciones

**Fecha:** 2026-05-20
**Rama:** `feat/abre-facil-saas-web`
**Resultado:** stack operable end-to-end en URLs públicas con multi-tenant validado.

Este documento es una guía de referencia para repetir el proceso o aplicarlo a otro
SaaS Node + Prisma + Postgres con el mismo trío de plataformas: **Supabase +
Render + Vercel**. Incluye cronología real, errores que aparecieron, fixes
aplicados, alternativas más eficientes y lecciones aprendidas.

---

## 1. Resultado final

| Componente   | URL pública                                          | Plataforma            |
|--------------|------------------------------------------------------|-----------------------|
| Frontend     | `https://collecta-web-ruby.vercel.app`               | Vercel (Vite SPA)     |
| Backend API  | `https://collecta-api-w1ka.onrender.com`             | Render (Node/Express) |
| Health       | `https://collecta-api-w1ka.onrender.com/api/health`  | Render (200 OK)       |
| Database     | Supabase project `mjdcnyqozqhkuzcnmrza` (us-east-2)  | Supabase Postgres 17  |
| Storage      | Bucket privado `statement-pdfs`                      | Supabase Storage      |

Validaciones end-to-end:

- 4 migraciones Prisma aplicadas vía `prisma migrate deploy` en el arranque.
- RLS habilitado en las 10 tablas Collecta; `anon` y `authenticated` revocadas.
- CORS funcional desde origen Vercel.
- Multi-tenant isolation: Despacho B no puede leer datos de Despacho A
  (`HTTP 404` directo contra `/api/clients/<id_A>` con token B).

---

## 2. Cronología completa

### Fase 0 — Lectura de fuente operativa

1. Leer `AGENTS.md` y `docs/PLAN_DEFINITIVO_COLLECTA.md`.
2. Confirmar decisiones vigentes: Vercel + Supabase + backend Node dedicado
   (Render como puente).
3. Validar que el repo usa Prisma con PostgreSQL y `@supabase/supabase-js` ya
   instalado en el backend.

### Fase 1 — Consolidar el trabajo previo de Codex

4. `git status` reveló **50 archivos modificados + 7 sin trackear** que Codex
   no había commiteado: `render.yaml`, `docs/runbooks/COLLECTA_SAAS_WEB.md`,
   tests nuevos, `tempFileStorage.ts` con soporte Supabase Storage, signup
   multi-tenant, etc.
5. Re-ejecutar verificación local en paralelo:
   - `backend npm run build` → OK (tsc clean).
   - `frontend npm run build` → OK (Vite, 2.02 s).
6. `git diff` de los `.env.example` para confirmar que solo había placeholders,
   no secretos reales.
7. `git add -A && git commit -m "feat: consolidate saas multi-tenant baseline …"`
   (66 archivos, +3069/−1463).
8. `git push origin feat/abre-facil-saas-web`.

### Fase 2 — Provisión de la base de datos (Supabase)

9. Conexión con Supabase MCP: `list_organizations`, `list_projects`.
10. Hallazgo: el proyecto `mjdcnyqozqhkuzcnmrza` existía pero estaba en
    estado **INACTIVE** (pausa automática del free tier).
11. `restore_project` → estado pasa a `COMING_UP` y luego a `ACTIVE_HEALTHY`.
12. Inspección de schema con `list_tables`: schema `public` vacío y 0
    migraciones registradas.
13. Lectura de las 3 migraciones existentes en
    `backend/prisma/migrations/`.
14. Aplicación inicial vía `apply_migration` MCP de las 3 migraciones:
    `20260408230536_init`, `20260504233000_add_whatsapp_and_agent_tables`,
    `20260518174500_add_multi_tenant_organizations`.
15. Verificación con `list_tables` + query a `Organization`: 10 tablas creadas
    y la org `default` con su slug presente.
16. **Decisión correctiva** (ver Obstáculo §3.3): los `apply_migration` MCP no
    escriben en `_prisma_migrations`, así que `prisma migrate deploy` en
    Render fallaría con drift. Se hace `DROP TABLE … CASCADE` de las 10 tablas
    Collecta para dejar la migración real en manos de Render.
17. Creación de **nueva migración local** `20260520120000_harden_rls_revoke_anon`
    con `REVOKE ALL`, `ALTER DEFAULT PRIVILEGES`, `ENABLE ROW LEVEL SECURITY`.
18. Creación del bucket privado `statement-pdfs` vía
    `INSERT INTO storage.buckets` con `public=false`, límite 25 MB y MIME
    `application/pdf`.
19. `get_advisors security` para hardening: el resultado pasó de **10 ERROR
    + 20 WARN** a **10 INFO** (RLS habilitado sin policies, esperado para
    un patrón service_role-only).
20. Commit + push de la migración RLS (`feat(db): harden public schema with RLS…`).

### Fase 3 — Despliegue del backend (Render)

21. Generación local de secretos: `JWT_SECRET` (48 bytes hex) y `API_KEY`
    (32 bytes hex), sin escribirlos a disco ni a git.
22. Apertura asistida de las 3 pestañas críticas con `Start-Process`:
    Supabase DB settings, Supabase API keys, Render Blueprint.
23. El usuario:
    - Reseteó la password de DB en Supabase.
    - Copió la `service_role` key.
    - Importó el repo en Render como Blueprint usando `render.yaml`.
24. **Deploy 1** (`30b4f6e`) → falla con `Exited with status 2 while building`.
    Causa: tsc no encuentra `@types/express` y otros (ver §3.4).
25. **Fix 1**: `npm ci --include=dev`. Deploy 2 (`e300fa8`) → mismo error.
26. **Fix 2**: `NPM_CONFIG_PRODUCTION=false npm ci`. Deploy 3 → mismo error.
27. **Fix 3 definitivo**: mover `@types/*`, `typescript` y `prisma` a
    `dependencies`. Deploy 4 (`e172cab`) → build OK, ahora falla en runtime
    con `Exited with status 1 while running`. Avance crucial.
28. Lectura del log runtime: `FATAL: (ENOTFOUND) tenant/user
    postgres.mjdcnyqozqhkuzcnmrza not found` apuntando a
    `aws-0-us-east-2.pooler.supabase.com`.
29. Diagnóstico vía Playwright en Supabase **Connect → ORM → Prisma**: el
    proyecto está en `aws-1-us-east-2.pooler.supabase.com`, no `aws-0-`.
30. El usuario actualizó `DATABASE_URL` y `DIRECT_URL` en Render con
    `aws-1-` + password real.
31. Deploy 5 → `/api/health` responde HTTP 200 en 0.48 s.
32. Verificación: `list_migrations` muestra las 4 migraciones aplicadas con
    `finished_at` poblado.

### Fase 4 — Despliegue del frontend (Vercel)

33. Comprobación: Vercel CLI no instalada. `npm install -g vercel` para
    instalación permanente (CLI 54.2.0).
34. `vercel login` → device auth en el browser.
35. `vercel link --yes --project collecta-web` → Vite detectado
    automáticamente.
36. `vercel env add VITE_API_URL production` con
    `https://collecta-api-w1ka.onrender.com/api`.
37. `vercel --prod --yes` → deploy READY en 24 s.
    Alias estable: `https://collecta-web-ruby.vercel.app`.

### Fase 5 — Cross-wire CORS

38. Curl preflight desde origen Vercel → **HTTP 500** en `/api/auth/signup`.
39. Diagnóstico: `backend/src/index.ts` hace
    `ALLOWED_ORIGINS.split(',').includes(origin)`. Como Render tenía
    `ALLOWED_ORIGINS="*"`, la búsqueda literal nunca matcheaba el origen real.
40. **Fix de código**: introducir helper `originMatches(origin, pattern)` con
    soporte para `*` total y patrones `https://*.vercel.app`.
41. Commit + push (`feat(cors): support wildcard patterns in ALLOWED_ORIGINS`).
    Render redeployó automáticamente.
42. Re-prueba: preflight responde `204` con
    `access-control-allow-origin: https://collecta-web-ruby.vercel.app`.

### Fase 6 — Smoke test multi-tenant

43. `POST /api/auth/signup` para **Despacho Smoke A** → JWT + `organizationId`.
44. `POST /api/clients` con token A → cliente creado con
    `organizationId` propio.
45. `POST /api/auth/signup` para **Despacho Smoke B** → JWT distinto.
46. `GET /api/clients/<id_A>` con token B → **HTTP 404 "Client not found"**.
47. Conteos finales en DB: 3 orgs (default + A + B), 2 users, 1 client.

---

## 3. Obstáculos y soluciones

Cada obstáculo está documentado con la **causa raíz**, el **fix aplicado**, y
una sección de **alternativas con pros y contras** para la próxima vez.

### 3.1 Trabajo de Codex sin commitear

**Síntoma:** la sesión previa de Codex había modificado 50 archivos y dejado 7
nuevos sin trackear, pero el `HEAD` seguía donde estaba al inicio. Si la
máquina hubiera reiniciado o Render hubiera tirado del repo remoto, todo
ese trabajo no estaría visible.

**Causa raíz:** Codex no autocommitea por diseño. Al cerrar sesión,
el working tree queda en disco pero el remoto no lo ve.

**Fix aplicado:**

1. Re-correr build local de backend y frontend para validar que el código
   estaba sano.
2. `git add -A` después de revisar que los `.env.example` no tenían secretos.
3. Commit consolidado con mensaje descriptivo.
4. Push a `feat/abre-facil-saas-web`.

**Alternativas:**

| Opción                                | Pros                                      | Contras                                                                |
|---------------------------------------|-------------------------------------------|------------------------------------------------------------------------|
| Auto-commit por hook en Codex/Claude  | No se pierde nada                         | Ensucia historial con commits intermedios; puede commitear secretos    |
| Stashing periódico (`git stash`)      | Salva sin commit                          | Difícil de recuperar entre sesiones; un `git stash pop` puede dar conflictos masivos |
| Branch separado de “working state”    | Aísla del branch principal                | Cuesta merge later                                                     |
| Commits semánticos al cerrar sesión   | Limpio y revisable                        | Requiere disciplina humana o un hook al `/exit`                        |

**Recomendado:** commits semánticos manuales + un hook tipo
`SessionEnd` que detecte working tree dirty y haga warning visible al usuario.

### 3.2 Proyecto Supabase pausado (INACTIVE)

**Síntoma:** intentar conectarse fallaba antes de que el restore terminara.

**Causa raíz:** el free tier de Supabase pausa proyectos sin tráfico tras
una semana. La metadata sigue, pero la DB está apagada.

**Fix aplicado:**

1. `restore_project` vía MCP.
2. Polling con `until` corto y `get_project` hasta `ACTIVE_HEALTHY`.
3. Primer `apply_migration` falló con
   `FATAL: 57P03: the database system is not accepting connections` mientras
   estaba en `COMING_UP`. Se reintentó tras polling.

**Alternativas:**

| Opción                                          | Pros                              | Contras                                          |
|-------------------------------------------------|-----------------------------------|--------------------------------------------------|
| Pago de plan Pro de Supabase                    | Sin pausa automática              | Costo recurrente                                 |
| Cron job que pingee la DB cada 3 días           | Mantiene proyecto vivo en free    | Hacky; viola espíritu del free tier              |
| Crear proyecto Supabase desde cero              | Estado limpio garantizado         | Pierdes referencia, settings y aceleras el costo |
| Migrar a Neon (otro proveedor free)             | No tiene pausa automática         | Cambio de stack y de capacidades                 |

**Recomendado:** restaurar el proyecto existente (gratis y rápido) y, para
producción real, plan Pro o un keep-alive ligero hecho por el propio backend
con una query trivial cada 24 h.

### 3.3 Migraciones aplicadas vía MCP no sincronizan con `_prisma_migrations`

**Síntoma:** después de aplicar las 3 migraciones via `apply_migration` MCP,
la tabla `_prisma_migrations` no existía. Si el deploy de Render hubiera
ejecutado `prisma migrate deploy`, Prisma habría intentado re-aplicar
DDLs sobre tablas que ya existían → fallo seguro.

**Causa raíz:** `apply_migration` del MCP registra la migración en su
**propio** ledger interno, no en el ledger de Prisma. Son sistemas paralelos
que no se enteran uno del otro.

**Fix aplicado:**

1. `DROP TABLE … CASCADE` de las 10 tablas Collecta (orden inverso por FK).
2. Dejar el bucket de Storage y la default org intactos (no afectan).
3. Permitir que `prisma migrate deploy` corra en el arranque de Render y
   cree todo desde cero **escribiendo correctamente** en `_prisma_migrations`.
4. Persistir el hardening RLS como **nueva migración Prisma local**
   (`20260520120000_harden_rls_revoke_anon`) para que también quede en el
   ledger oficial.

**Alternativas:**

| Opción                                                          | Pros                                     | Contras                                                                  |
|-----------------------------------------------------------------|------------------------------------------|--------------------------------------------------------------------------|
| Crear `_prisma_migrations` manualmente con SHA-256 calculados   | No requiere drop                         | Frágil: el checksum debe coincidir; un único byte diferente y rompe      |
| `prisma migrate resolve --applied <name>` desde shell de Render | Oficialmente soportado por Prisma        | Requiere un “One-Off Job” o shell session post-deploy                    |
| Usar `prisma db push` en vez de `prisma migrate`                | No usa ledger; siempre sincroniza schema | Pierdes historial; peligroso para producción                             |
| **Drop + dejar que Prisma migre desde cero**  *(elegida)*       | Limpio; el ledger queda 100 % auténtico  | Solo viable si no hay datos productivos                                  |

**Recomendado:** **nunca** mezclar `apply_migration` MCP con `prisma migrate`
en el mismo proyecto. Decidir desde el día 1 cuál sistema es el dueño del
schema. Para proyectos con Prisma, dejar que Prisma sea la única fuente.

### 3.4 Render strippea devDependencies durante el build

**Síntoma:** primer deploy falla con docenas de `error TS7016: Could not
find a declaration file for module 'express'` y similares para `multer`,
`pdfkit`, `jsonwebtoken`, además de `vitest` en archivos `.test.ts`.

**Causa raíz:** Render setea `NODE_ENV=production` a nivel proceso. `npm ci`
respeta esa variable y omite `devDependencies`, donde vivían los `@types/*`
y `typescript` mismo.

**Fixes intentados:**

| Intento                                              | Resultado                |
|------------------------------------------------------|--------------------------|
| `npm ci --include=dev`                               | Sigue omitiendo devDeps  |
| `NPM_CONFIG_PRODUCTION=false npm ci --include=dev`   | Sigue omitiendo devDeps  |
| **Mover `@types/*` + `typescript` + `prisma` a `dependencies`** *(funcionó)* | Build OK                 |

**Fix final aplicado:**

```json
"dependencies": {
  ...
  "@types/cors": "^2.8.19",
  "@types/express": "^5.0.6",
  "@types/jsonwebtoken": "^9.0.10",
  "@types/multer": "^2.1.0",
  "@types/node": "^25.5.0",
  "@types/pdfkit": "^0.17.5",
  "typescript": "^5.9.3",
  "prisma": "6.4.1",
  ...
}
```

Adicionalmente, en `tsconfig.json` se excluyeron los `.test.ts` y `__tests__/`
de la compilación de producción para que `vitest` (que sí permaneció en
devDependencies) no fuera necesario en runtime.

**Alternativas:**

| Opción                                                              | Pros                                       | Contras                                                  |
|---------------------------------------------------------------------|--------------------------------------------|----------------------------------------------------------|
| Mover `@types/*` y `typescript` a `dependencies` *(elegida)*        | Siempre funciona, en cualquier plataforma  | La imagen runtime queda con paquetes que no se usan      |
| Dos-fase: `npm install` + `tsc` + `npm prune --production`          | Imagen runtime limpia                      | Más complejo en `buildCommand`; cache de build menos eficaz |
| `tsc --noEmitOnError false` + `skipLibCheck`                        | Bypass de errores                          | Apaga la red de seguridad de tipos                       |
| Pre-compilar localmente y subir `dist/` a un release artifact       | Build determinista                         | Pierdes el ciclo Git→build→deploy automático             |
| Cambiar a un runner que respete `npm ci --include=dev` (Fly.io)     | Comportamiento estándar                    | Migración de plataforma; perdés Blueprint de Render      |

**Recomendado:** para deploys en Render free, mover los tipos críticos
a `dependencies` desde el día 1 y documentarlo. Para Render plan superior o
una imagen Docker propia, la fase doble `install → build → prune` es más
elegante.

### 3.5 Pooler de Supabase con prefijo incorrecto (`aws-0-` vs `aws-1-`)

**Síntoma:** build pasó, pero `prisma migrate deploy` falla en runtime con
`FATAL: (ENOTFOUND) tenant/user postgres.mjdcnyqozqhkuzcnmrza not found`
apuntando a `aws-0-us-east-2.pooler.supabase.com:5432`.

**Causa raíz:** las instrucciones iniciales sugerían el pooler en
`aws-0-us-east-2`, pero este proyecto específico vive en
`aws-1-us-east-2.pooler.supabase.com`. El hostname existe pero **no aloja
ese tenant**, por eso devuelve "not found" en lugar de un error DNS.

**Fix aplicado:**

1. Navegar en Supabase Dashboard → **Connect → ORM → Prisma**, que muestra
   los URLs exactos para este proyecto.
2. Actualizar `DATABASE_URL` (pooler 6543, `?pgbouncer=true&connection_limit=1`)
   y `DIRECT_URL` (pooler 5432) en Render Environment.
3. Render redeployó automáticamente al detectar cambio en env vars.

**Alternativas:**

| Opción                                                          | Pros                               | Contras                                                          |
|-----------------------------------------------------------------|------------------------------------|------------------------------------------------------------------|
| Copiar el URL **siempre** desde Supabase Connect ORM tab        | Garantizado correcto               | Requiere paso humano cada vez                                    |
| Detectar el host pooler vía MCP `get_project`                   | Automatizable                      | El MCP de Supabase no expone el host del pooler ni la password   |
| Usar Direct Connection (`db.<ref>.supabase.co`) en vez de pooler | Más simple, sin riesgo `aws-N-` | Sin pooling para queries; menos eficiente con Express serverless |
| Probar varios prefijos con un script (`aws-0`, `aws-1`, …)      | Auto-discovery                     | Cada intento puede caer en rate limits o auditoría               |

**Recomendado:** **siempre** leer el connection string desde
`Connect → ORM → Prisma` antes de configurar Render. Nunca asumir el prefijo
del pooler. Como alternativa robusta para proyectos sin tráfico crítico,
usar Direct Connection (puerto 5432, hostname `db.<ref>.supabase.co`) tanto
en `DATABASE_URL` como en `DIRECT_URL`.

### 3.6 `ALLOWED_ORIGINS="*"` no funciona como wildcard literal

**Síntoma:** `OPTIONS /api/auth/signup` con `Origin:
https://collecta-web-ruby.vercel.app` retorna HTTP 500.

**Causa raíz:** `backend/src/index.ts` parseaba `ALLOWED_ORIGINS` con
`split(',')` y comparaba con `.includes(origin)`. Buscar el string literal
`"*"` en el array no matchea nunca contra la URL real, así que CORS lanza
una excepción.

**Fix aplicado:**

```ts
function originMatches(origin: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern === origin) return true;
  if (pattern.includes('*')) {
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '[^.]+');
    return new RegExp(`^${escaped}$`).test(origin);
  }
  return false;
}
```

Ahora soporta `*` global, match exacto, y patrones como
`https://*.vercel.app`. El env var en Render se quedó como `*` durante el
smoke test y puede tightenearse después sin tocar código.

**Alternativas:**

| Opción                                                          | Pros                            | Contras                                                          |
|-----------------------------------------------------------------|---------------------------------|------------------------------------------------------------------|
| **Soporte wildcard en código** *(elegida)*                      | Robusto y futuro-proof          | Hay que recordar tightening en producción                        |
| Listar origines exactos en `ALLOWED_ORIGINS`                    | Estricto y explícito            | Requiere redeploy cada vez que Vercel cambia preview URL         |
| Permitir todo cuando `NODE_ENV !== production`                   | Buena UX de dev                 | Si la env var queda mal seteada en prod, expone el backend       |
| Usar paquete `cors` con regex nativo                            | Menos código propio             | Sintaxis menos legible; `cors` espera string o RegExp, no patrones tipo glob |

**Recomendado:** soportar patrones en código + lista explícita en env var.
Antes de producción real, restringir a:
`https://collecta-web-ruby.vercel.app,https://*-javicanelas-projects.vercel.app`
(production + previews).

---

## 4. Comandos clave (cheat sheet)

```bash
# Verificación local antes de empujar cambios al backend
cd backend && rm -rf dist && npm run build

# Smoke health-check del backend en producción
curl -sS -w "\nHTTP %{http_code}\n" https://collecta-api-w1ka.onrender.com/api/health

# Smoke CORS preflight desde origen Vercel
curl -sS -X OPTIONS \
  -H "Origin: https://collecta-web-ruby.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -D - https://collecta-api-w1ka.onrender.com/api/auth/signup

# Generar JWT_SECRET y API_KEY sin escribirlos a disco
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Vercel: link + env var + deploy
cd frontend
vercel link --yes --project collecta-web
echo "https://collecta-api-w1ka.onrender.com/api" \
  | vercel env add VITE_API_URL production
vercel --prod --yes
```

---

## 5. Recomendaciones finales

### 5.1 Procesos

1. **Lee la fuente operativa antes de actuar.** En este proyecto, `AGENTS.md`
   y `docs/PLAN_DEFINITIVO_COLLECTA.md` definen reglas que evitan errores
   caros (qué se puede mover, qué no, qué runtime es oficial).
2. **Commit + push antes de cualquier deploy.** Render lee desde GitHub: un
   working tree dirty es invisible para el blueprint.
3. **Una sola fuente de verdad para el schema.** Si vas a usar Prisma,
   *todas* las DDLs viven en `backend/prisma/migrations/`. Nunca apliques
   migraciones a la DB por otro canal (MCP, dashboard SQL editor, etc.) si
   Prisma será quien las ejecute después.
4. **Verifica los URLs en su panel oficial.** En Supabase: `Connect → ORM →
   Prisma`. En Render: leer el `service URL` real del dashboard. En Vercel:
   leer el `production URL` de la salida del CLI. Nunca inventes prefijos
   o subdominios.

### 5.2 Configuración por defecto recomendada

| Pieza                                  | Valor recomendado                                                                 |
|----------------------------------------|-----------------------------------------------------------------------------------|
| `backend/package.json`                 | `@types/*` críticos en `dependencies`, no en `devDependencies` (Render free)      |
| `backend/tsconfig.json`                | Excluir `src/__tests__/**` y `src/**/*.test.ts*` de la build de producción        |
| `render.yaml` `buildCommand`           | `npm ci && npx prisma generate && npm run build`                                  |
| `render.yaml` `startCommand`           | `npx prisma migrate deploy && npm start`                                          |
| `DATABASE_URL`                         | Pooler **transaction mode** puerto 6543 + `?pgbouncer=true&connection_limit=1`    |
| `DIRECT_URL`                           | Pooler **session mode** puerto 5432 (o Direct `db.<ref>.supabase.co:5432`)        |
| `ALLOWED_ORIGINS` (smoke)              | `*` (temporal, validado por código con wildcard support)                          |
| `ALLOWED_ORIGINS` (producción)         | `https://app.tudominio.com,https://*-team-name.vercel.app`                        |
| RLS                                    | `ENABLE` + `REVOKE FROM anon, authenticated`. Backend usa role privilegiado.      |

### 5.3 Decisiones que pagaron dividendo

- **Restaurar el proyecto existente en lugar de crear uno nuevo.** Ahorró
  ~5 min y evitó costos. Single command vía MCP.
- **Drop tables + dejar a Prisma migrar desde cero.** Mantuvo el ledger
  `_prisma_migrations` 100 % consistente con los archivos en el repo.
- **Persistir el RLS hardening como migración Prisma**, no como acción manual.
  Cualquier ambiente nuevo (staging, fork) hereda la postura segura.
- **Soporte wildcard en CORS**, no listas estáticas. Cero cambios de código
  cuando salgan los preview deployments de Vercel.
- **Smoke test multi-tenant con curl directo a la API**, no via UI. Catch del
  bug de aislamiento al 100 %, en segundos, sin dependencias.

### 5.4 Cosas para hardenear antes de producción real

1. Tightear `ALLOWED_ORIGINS` en Render: `*` → URL de Vercel + patrón de previews.
2. Borrar las cuentas smoke (`Despacho Smoke A/B` + cliente) si no las quieres
   como dataset histórico.
3. Configurar `EMAIL_PROVIDER` y `RESEND_API_KEY` para password reset y
   notificaciones cuando estén en scope.
4. Si WhatsApp programático entra en scope, configurar `EVOLUTION_*` con
   self-host sin costo de servicio (decisión del AGENTS.md).
5. Plan Pro de Supabase o keep-alive integrado para evitar pausas en producción.
6. Habilitar RLS en `_prisma_migrations` (defense-in-depth, no funcional).
7. Considerar mover backend a una región Render más cercana a Supabase
   (`us-east-2`) para reducir latencia DB. Hoy está en `oregon` (default).

---

## 6. Lecciones aprendidas

### 6.1 Sobre infraestructura serverless gratuita

- **Las plataformas free imponen reglas no documentadas.** Render
  strippea devDependencies aunque pongas la flag inversa. La única
  contramedida confiable es no depender de devDeps para tu build.
- **Los proyectos pausados no son fallos: son features del free tier.**
  Restaurar es trivial vía API/MCP.
- **El pooler de Supabase usa nomenclatura por proyecto.** Nunca asumir el
  prefijo (`aws-0-` vs `aws-1-`). Siempre leer del dashboard Connect.

### 6.2 Sobre Prisma y migraciones

- **`_prisma_migrations` es el corazón de la confiabilidad.** Si dos sistemas
  escriben en el mismo schema sin coordinarse, vas a tener drift.
- **`prisma migrate deploy` en startup es ideal en serverless**, siempre y
  cuando el startup tenga acceso a `DIRECT_URL` (no pooler de transactions).
- **Excluir tests del build de producción** es estándar y reduce ataque,
  size y tiempo.

### 6.3 Sobre CORS

- **`includes(origin)` con `"*"` literal es un bug silencioso muy común** en
  servicios Node. Solo se descubre cuando el frontend real intenta llamarte
  desde un origen externo.
- Soportar patrones glob (`https://*.vercel.app`) elimina una clase entera de
  redeploys disparados por cambios de URL preview.

### 6.4 Sobre flujo de trabajo agente + humano

- **El humano debe iniciar sesión una vez por plataforma; el agente controla
  todo lo demás.** Ese fue el contrato operativo que el usuario propuso y
  funcionó: minimiza fricción y mantiene credenciales fuera del agente.
- **Las acciones de plataformas externas (deploy, env vars) deben hacerse
  por CLI o MCP cuando exista.** Browser automation funciona pero es frágil
  y depende de que Playwright esté activo.
- **Verificación end-to-end con curl es el mejor predictor de éxito.** Si
  health, preflight CORS y signup multi-tenant pasan vía CLI, el sistema
  está vivo para usuarios reales.

### 6.5 Sobre la depuración misma

Los 5 deploys fallidos no fueron "fallos" sino **señales**:

| Deploy | Tipo de error                              | Significado                  |
|--------|--------------------------------------------|------------------------------|
| 1      | "status 2 while building" (TS7016)         | Falta de devDependencies     |
| 2      | "status 2 while building" (TS7016)         | `--include=dev` ignorada     |
| 3      | "status 2 while building" (TS7016)         | `NPM_CONFIG_PRODUCTION=false` ignorada |
| 4      | "status 1 while running" (ENOTFOUND)       | Build OK; el problema es env vars |
| 5      | HTTP 200                                   | OK                           |

Cada deploy fallido **acotó el problema**. Saber que "while building" → "while
running" implicó que el build se había desbloqueado, lo que cambia el área
de búsqueda completamente.

---

## 7. Referencias internas

- `AGENTS.md` — fuente operativa principal del proyecto.
- `docs/PLAN_DEFINITIVO_COLLECTA.md` — fases, decisiones, criterios de éxito.
- `docs/runbooks/COLLECTA_SAAS_WEB.md` — runbook formal de despliegue.
- `render.yaml` — blueprint del backend en Render.
- `frontend/vercel.json` — config SPA fallback en Vercel.
- `backend/prisma/migrations/20260520120000_harden_rls_revoke_anon/` — fix
  RLS persistido como migración.
- `backend/src/index.ts` — CORS con soporte wildcard (sección `originMatches`).
- `backend/src/services/tempFileStorage.ts` — Supabase Storage para PDFs
  temporales.
