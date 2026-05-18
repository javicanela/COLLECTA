# Collecta Abre Facil - SaaS Web Publico

## Objetivo

Distribuir Collecta como una URL publica multi-tenant accesible desde desktop y
movil. El despacho abre el link, registra su organizacion, inicia sesion y opera
solo con sus propios datos.

Esta es la unica version final en construccion. No hay un segundo desarrollo
descargable, local-first ni para `localhost` como distribucion de producto. Los
scripts y el entorno local solo son herramientas internas para que Codex
construya, pruebe y depure esta misma version SaaS antes de que el usuario la
use buscando fallos reales.

La prioridad inmediata es tener una version operable real. Despues de que exista,
cada mejora se tratara como una actualizacion de esta misma version final: se
instala primero en un respaldo o staging, se verifica, y solo entonces se
promueve a la instancia que usa el usuario.

## Decisiones confirmadas

- Multi-tenant con aislamiento de datos por organizacion.
- Movil usable es requisito de producto.
- Backend hosteado esta aprobado para esta version.
- Deploy oficial: frontend en Vercel, backend en Railway y PostgreSQL en Neon.
- Smart Import sigue web-first, deterministic-first y provider-agnostic.
- Cero secretos en git. Variables reales solo en dashboards de plataforma o en
  la sesion local temporal de Codex.
- El usuario probara la version final despues de que Codex la implemente y
  verifique builds, tests, responsive, PWA, multi-tenant y smoke tests.
- Las mejoras posteriores no crean ramas de producto paralelas; son
  actualizaciones controladas de la version final.

## Contrato operativo para plataformas externas

Cuando un paso requiera Vercel, Railway, Neon, GitHub, Cloudflare u otra cuenta
externa, Codex debe:

1. Abrir el navegador del sistema en la URL de la plataforma con el comando del
   sistema operativo (`Start-Process`, `open` o `xdg-open`).
2. Esperar a que la sesion del usuario quede activa en ese navegador.
3. Usar el CLI oficial cuando exista (`vercel`, `railway`, `gh`, `neonctl`,
   `wrangler`) para que el flujo sea reproducible.
4. Si la autenticacion no se puede resolver por CLI, dejar el navegador abierto
   en la pantalla correcta y pedir confirmacion explicita antes de avanzar.
5. No pegar secretos en el repo. Las claves se configuran en dashboards o como
   variables de proceso temporales.

## Fallbacks de plataforma

Antes de cambiar de plataforma, documentar el bloqueo en esta guia, confirmar
el switch con el usuario y limpiar artefactos sueltos si quedaron creados.

| Servicio | Primario | Alternativas |
|---|---|---|
| Frontend | Vercel | Cloudflare Pages, Netlify, Render Static |
| Backend | Railway | Render, Fly.io, Cloudflare Workers si el backend acepta el cambio |
| Postgres | Neon | Supabase Postgres, Railway Postgres, Render Postgres |
| Dominio | Dominio elegido por el usuario | Dominio gratis del host |
| CI release | GitHub Actions | Ejecucion manual local documentada |

## Fase 0 - Preparacion del repositorio

Objetivo: dejar rama, scripts y configuracion listos antes de tocar plataformas
externas.

Acciones:

- Crear rama `feat/abre-facil-saas-web`.
- Reescribir este runbook para describir la version final SaaS, no localhost.
- Mantener las instrucciones de `localhost` solo como soporte tecnico interno
  de build/test, no como version de producto.
- Actualizar `AGENTS.md` y `docs/PLAN_DEFINITIVO_COLLECTA.md` para anclar
  Vercel + Railway + Neon como decision vigente.
- Confirmar que `frontend/vercel.json`, `backend/railway.json` y los
  `.env.example` no contienen secretos reales.

Criterio: el diff de esta fase no toca secretos y deja claro que la unica
version distribuible es Collecta SaaS publico.

## Fase 1 - Multi-tenant en backend

Objetivo: que cada despacho vea solo sus datos.

Archivos criticos:

- `backend/prisma/schema.prisma`: agregar `Organization` y `organizationId` con
  FK e indices en `User`, `Client`, `Operation`, `LogEntry`, `AgentExecution`,
  `AgentAction`, `AgentConfig` y `Config`.
- `backend/src/middleware/auth.ts`: incluir `organizationId` en JWT y exponerlo
  en `req.user`.
- `backend/src/routes/*.ts`: filtrar todas las queries Prisma por
  `organizationId`.
- Crear helper `requireOrg(req)` y aplicarlo de forma uniforme.
- Migracion Prisma con backfill: asignar filas existentes a una organizacion
  `default` antes de marcar columnas como `NOT NULL`.

Tests obligatorios en `backend/`:

- Despacho A crea cliente. Despacho B pide ese cliente por ID. Resultado: `404`.
- Repetir aislamiento para operaciones, logs y config.
- No avanzar a Fase 2 hasta que estos tests existan y pasen.

Checklist de revision:

- `clients.ts`
- `operations.ts`
- `logs.ts`
- `config.ts`
- `cobranza.ts`
- `agent.ts`
- `n8n.ts`
- `import.ts`
- `whatsapp.ts`
- `diagnostics.ts`

## Fase 2 - Signup, login y cuenta minima

Objetivo: que un despacho nuevo se registre desde la web sin intervencion
manual.

Archivos criticos:

- `backend/src/routes/auth.ts`: `POST /api/auth/signup` crea `Organization` +
  `User` admin con password hasheado; `POST /api/auth/login` regresa JWT.
- `frontend/src/views/SignupView.tsx` y `LoginView.tsx`: formularios
  responsivos usando patrones existentes.
- `frontend/src/App.tsx`: rutas `/signup` y `/login` antes del dashboard.
- Topbar muestra nombre del despacho. No hardcodear marcas de clientes.

Fuera de scope inicial: reset por email. Documentarlo como bloqueo conocido.

## Fase 3 - Responsive movil real

Objetivo: usar Collecta en iPhone 14 y Pixel 7 sin overflow ni controles
inalcanzables.

Acciones:

- Auditar `frontend/src/views/*`, especialmente Dashboard, Registros y Exportar.
- Convertir tablas anchas a patrones responsive con breakpoints `sm:` y `md:`.
- Colapsar sidebar/topbar a menu hamburguesa bajo `768px`.
- Garantizar touch targets de al menos `44px`.
- Probar con perfiles iPhone 14 y Pixel 7.

Criterio: Lighthouse mobile con accessibility y best-practices `>= 90`, y
performance `>= 80`.

## Fase 4 - PWA instalable en produccion

Objetivo: que desktop y movil permitan instalar Collecta como app.

Archivos criticos:

- `frontend/public/manifest.webmanifest`: `name`, `short_name`,
  `theme_color`, `background_color` e iconos PNG `192x192` y `512x512` con
  `purpose: "any"` y `purpose: "maskable"`.
- `frontend/public/icons/`: PNG reales de marca Collecta.
- `frontend/public/service-worker.js`: cache de shell y `offline.html`, sin
  cachear API en esta version.
- `frontend/index.html`: Open Graph y Twitter Card para compartir por WhatsApp
  o email.

## Fase 5 - Base de datos hosteada

Objetivo: tener `DATABASE_URL` PostgreSQL accesible desde internet.

Plan primario: Neon.

Pasos:

1. Abrir `https://console.neon.tech/`.
2. Esperar sesion activa del usuario.
3. Crear proyecto `collecta-prod` en la region mas cercana.
4. Obtener `DATABASE_URL` con `?sslmode=require`.
5. Validar con `psql "$DATABASE_URL" -c "SELECT 1"` sin guardar el secreto en
   git.

Fallback: Supabase Postgres. Si tambien bloquea, Railway Postgres como ultimo
recurso.

## Fase 6 - Despliegue backend

Objetivo: Express + Prisma corriendo en URL publica con healthcheck verde.

Plan primario: Railway.

Pasos:

1. Abrir `https://railway.app/`.
2. Confirmar sesion y conexion con GitHub.
3. Instalar Railway CLI si falta y correr `railway login`.
4. Inicializar desde `backend/` o conectar repo desde GitHub.
5. Configurar variables en Railway:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `API_KEY`
   - `ADMIN_USER`
   - `ADMIN_PASS`
   - `ALLOWED_ORIGINS` cuando exista la URL de frontend
6. Confirmar que `backend/railway.json` ejecuta build, migraciones y
   healthcheck `/api/health`.
7. Validar `curl https://<servicio>.up.railway.app/api/health`.

Fallback: Render; despues Fly.io.

## Fase 7 - Despliegue frontend

Objetivo: frontend publico apuntando al backend de Fase 6.

Plan primario: Vercel.

Pasos:

1. Abrir `https://vercel.com/`.
2. Confirmar sesion.
3. Instalar Vercel CLI si falta y correr `vercel login`.
4. Desde `frontend/`, correr `vercel link` y `vercel --prod`.
5. Configurar `VITE_API_URL=<backend-public-url>/api`.
6. Actualizar `frontend/vercel.json` con rewrite `/api/:path*` hacia backend y
   CORS para el dominio asignado.
7. Agregar el dominio de Vercel a `ALLOWED_ORIGINS` en Railway.
8. Validar signup/login end-to-end y ausencia de errores CORS.

Fallback: Cloudflare Pages; despues Netlify.

## Fase 8 - Dominio y compartir

Objetivo: URL final compartible.

Opciones:

- Sin dominio propio: usar `https://collecta-*.vercel.app`.
- Con dominio propio: registrar el dominio elegido por el usuario, configurar
  DNS hacia Vercel y agregarlo a `ALLOWED_ORIGINS` en Railway.

El dominio propio es opcional para v1.

## Fase 9 - Verificacion end-to-end

Antes de cerrar:

1. Crear cuenta Despacho A desde URL publica.
2. Registrar dos clientes y una operacion.
3. En sesion privada, crear cuenta Despacho B.
4. Con token de B, pedir un cliente de A:
   `curl -H "Authorization: Bearer <token_B>" https://<backend>/api/clients/<id_A>`.
   Debe responder `404`.
5. Ejecutar Smart Import en `/registros` con un Excel real, llegar a preview,
   confirmar commit y verificar aislamiento por despacho.
6. Ejecutar Lighthouse mobile contra URL publica.
7. Instalar PWA en iPhone Safari y Android Chrome.
8. Ejecutar:
   - `cd frontend && npm run build && npm test`
   - `cd backend && npm run build && npm test`
9. Documentar resultados en este runbook.

## Actualizaciones despues de la primera version operable

Cuando Collecta ya este operable y el usuario la este usando, cada mejora debe
seguir este flujo:

1. Crear respaldo de base de datos y confirmar punto de restauracion.
2. Desplegar la actualizacion en staging o entorno de respaldo.
3. Ejecutar migraciones contra ese entorno, nunca primero contra produccion.
4. Correr build, tests, smoke tests, prueba multi-tenant y flujo Smart Import.
5. Validar UI movil y PWA si la mejora toca frontend.
6. Documentar resultado y riesgos.
7. Promover a produccion solo si la verificacion pasa.
8. Mantener plan de rollback antes de aplicar cambios con riesgo.

Si una actualizacion falla en staging, se corrige en esa misma linea de trabajo.
No se promueve una variante alternativa del producto.

## Bloqueos conocidos

- Si Vercel exige tarjeta o verificacion para builds, saltar a Cloudflare Pages.
- Si Railway exige upgrade obligatorio, saltar a Render.
- Si Neon exige tarjeta o limita region, saltar a Supabase.
- Si una migracion Prisma falla en Neon y no hay datos reales, regenerar la DB.
- Si HTTPS de dominio propio tarda en propagar, usar dominio del host.
- Reset de password por email queda fuera de scope inicial.

## Definition of Done

- URL publica compartible abre y permite signup.
- Dos despachos creados con datos completamente aislados y prueba directa por
  API.
- PWA instalable en desktop y movil con icono PNG real.
- Builds y tests verdes en `frontend/` y `backend/`.
- Este runbook describe entrada al SaaS, no localhost.
- No hay dos desarrollos: local es solo entorno interno de verificacion.
- Las actualizaciones futuras se prueban primero en respaldo/staging.
- Cero secretos en git.
- Cambios en rama y PR con resumen y checklist de pruebas.
