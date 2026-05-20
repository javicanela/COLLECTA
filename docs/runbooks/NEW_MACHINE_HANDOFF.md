# Handoff a Nuevo Equipo - Collecta

Fecha: 2026-05-20  
Rama vigente: `feat/abre-facil-saas-web`  
Repositorio: `https://github.com/javicanela/COLLECTA.git`

Este runbook describe como mover el proyecto Collecta a un equipo nuevo y
continuar desde el mismo punto sin depender de archivos locales del equipo
anterior.

## 1. Que se transfiere por GitHub

Usa GitHub como fuente principal. El codigo y la documentacion ya estan en:

```text
https://github.com/javicanela/COLLECTA.git
branch: feat/abre-facil-saas-web
HEAD minimo esperado: fe33d38 docs: add collecta deploy retrospective
```

GitHub contiene:

- `backend/`: API Express, Prisma, migraciones y tests.
- `frontend/`: app React/Vite, Playwright y config Vercel.
- `n8n/`: workflows exportados y guia de configuracion.
- `docs/`: plan, runbooks, retrospectiva de deploy y specs.
- `render.yaml`: blueprint del backend Render.
- `docker-compose.test.yml`: Postgres local para tests.
- `scripts/`: comandos PowerShell de setup/start/test.

No transfieras manualmente estos directorios/archivos si ya vas por Git:

- `node_modules/`
- `dist/`, `build/`
- `.env`, `.env.test`, `.env.local`, `.env.production`
- `.vercel/`, `frontend/.vercel/`
- `backend/tmp/`, reportes generados, logs locales
- screenshots o capturas de dashboards, especialmente `render-env.jpg`

## 2. Secretos y datos que no van en GitHub

Los secretos deben recrearse desde dashboards o un gestor seguro. No mandarlos
por email ni pegarlos en documentos.

Necesarios para backend remoto o entorno productivo:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `API_KEY`
- `ALLOWED_ORIGINS`
- `BACKEND_PUBLIC_URL`
- `TEMP_PDF_STORAGE_PROVIDER=supabase`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET=statement-pdfs`
- `SUPABASE_JWT_SECRET` o `SUPABASE_JWKS_URL` si se usa Supabase Auth externo
- `EVOLUTION_*` si WhatsApp programatico esta habilitado
- `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM` si email entra en scope
- `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY` solo si se habilitan
  providers cloud/BYOK

Necesarios para frontend:

- `VITE_API_URL`
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` solo si se usa Supabase Auth
  desde navegador.

Datos actuales de plataforma documentados:

- Frontend publico: `https://collecta-web-ruby.vercel.app`
- Backend publico: `https://collecta-api-w1ka.onrender.com`
- Health: `https://collecta-api-w1ka.onrender.com/api/health`
- Supabase project ref: `mjdcnyqozqhkuzcnmrza`
- Supabase bucket privado: `statement-pdfs`

## 3. Requisitos del nuevo equipo

Instala:

- Git
- Node.js 22.x con npm
- Docker Desktop, requerido para `npm run test:full` y DB local segura
- PowerShell 7 o Windows PowerShell
- Navegador moderno
- Opcional: GitHub CLI (`gh`)
- Opcional: Vercel CLI (`npm install -g vercel`)
- Opcional: Supabase CLI, solo si vas a operar Supabase desde terminal

Comprueba versiones:

```powershell
git --version
node --version
npm --version
docker --version
docker info
```

## 4. Clonar el proyecto

```powershell
cd "$env:USERPROFILE\Documents"
git clone https://github.com/javicanela/COLLECTA.git
cd COLLECTA
git checkout feat/abre-facil-saas-web
git pull --ff-only origin feat/abre-facil-saas-web
git log --oneline -5
git status --short --branch
```

El historial debe incluir como minimo:

```text
fe33d38 docs: add collecta deploy retrospective
```

Si este runbook ya fue commiteado, `HEAD` puede ser posterior. Lo importante es
que `git status --short --branch` muestre la rama sin cambios locales.

## 5. Instalar dependencias locales

Ruta automatizada recomendada en Windows:

```powershell
.\scripts\collecta-doctor.ps1
.\scripts\collecta-setup.ps1
```

Esto:

- Crea `backend/.env.test` desde `backend/.env.test.example` si falta.
- Instala dependencias en backend y frontend.
- Prepara la DB local de test si Docker esta activo.
- Corre diagnostico del entorno.

Ruta manual:

```powershell
cd backend
npm ci
npx prisma generate
Copy-Item .env.test.example .env.test -ErrorAction SilentlyContinue
cd ..\frontend
npm ci
npx playwright install
cd ..
```

## 6. Verificar que el entorno local funciona

Verificacion rapida:

```powershell
cd backend
npm run build
npm test

cd ..\frontend
npm run build
npm run lint
npm test
```

Verificacion completa con DB local:

```powershell
docker compose -f docker-compose.test.yml up -d
cd backend
npm run test:full
cd ..\frontend
npm run test:e2e
```

Si Docker no esta activo, abre Docker Desktop y repite.

## 7. Levantar Collecta local

Para usar backend y frontend locales:

```powershell
.\scripts\collecta-start.ps1 -Force
```

URLs locales:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001/api/health`

Para detener:

```powershell
.\scripts\collecta-stop.ps1
```

## 8. Configurar `.env` local de desarrollo

Para desarrollo local real, crea:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Edita los archivos localmente. Nunca los commitees.

Opcion A, trabajar contra backend local:

```text
frontend/.env
VITE_API_URL=http://localhost:3001/api
```

Opcion B, frontend local contra backend publico:

```text
frontend/.env
VITE_API_URL=https://collecta-api-w1ka.onrender.com/api
```

Para backend local con Supabase real, copia `DATABASE_URL`, `DIRECT_URL`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_STORAGE_BUCKET` desde
Supabase/Render de forma segura. No uses email para secretos.

## 9. Acceso a plataformas externas

El equipo nuevo necesita login o invitacion a:

- GitHub repo `javicanela/COLLECTA`
- Vercel project `collecta-web`
- Render service `collecta-api`
- Supabase project `mjdcnyqozqhkuzcnmrza`
- n8n si se van a activar automatizaciones
- Evolution API si WhatsApp programatico entra en scope

Verificaciones publicas sin secretos:

```powershell
Invoke-WebRequest https://collecta-api-w1ka.onrender.com/api/health -UseBasicParsing
Invoke-WebRequest https://collecta-web-ruby.vercel.app -UseBasicParsing
```

CORS preflight:

```powershell
Invoke-WebRequest `
  -Uri "https://collecta-api-w1ka.onrender.com/api/auth/signup" `
  -Method OPTIONS `
  -Headers @{
    Origin="https://collecta-web-ruby.vercel.app";
    "Access-Control-Request-Method"="POST";
    "Access-Control-Request-Headers"="content-type"
  } `
  -UseBasicParsing
```

## 10. Produccion y deploy

Backend:

- Plataforma: Render.
- Config: `render.yaml`.
- Root directory: `backend`.
- Build command: `npm ci && npx prisma generate && npm run build`.
- Start command: `npx prisma migrate deploy && npm start`.
- Health check path: `/api/health`.

Frontend:

- Plataforma: Vercel.
- Root: `frontend`.
- Env production: `VITE_API_URL=https://collecta-api-w1ka.onrender.com/api`.

Antes de redeploy:

```powershell
git status --short --branch
cd backend
npm run build
npm test
cd ..\frontend
npm run build
npm run lint
```

Despues de deploy:

```powershell
Invoke-WebRequest https://collecta-api-w1ka.onrender.com/api/health -UseBasicParsing
Invoke-WebRequest https://collecta-web-ruby.vercel.app -UseBasicParsing
```

## 11. Si necesitas transferir por ZIP o email

Preferir GitHub. Si por alguna razon necesitas ZIP:

```powershell
git archive --format=zip --output collecta-source.zip feat/abre-facil-saas-web
```

Ese ZIP incluye solo archivos trackeados por Git. No incluye secretos,
`node_modules`, `.env`, `.vercel` ni capturas ignoradas.

No uses `Compress-Archive` sobre la carpeta completa salvo que revises primero
que no incluya `.env`, screenshots de dashboards, `node_modules` o `.vercel`.

## 12. Documentos que debe leer el nuevo equipo

Orden recomendado:

1. `AGENTS.md`
2. `README.md`
3. `docs/runbooks/COLLECTA_DEPLOY_RETROSPECTIVA.md`
4. `docs/runbooks/COLLECTA_SAAS_WEB.md`
5. `docs/PLAN_DEFINITIVO_COLLECTA.md`
6. `backend/.env.example`
7. `frontend/.env.example`
8. `n8n/README.md`

## 13. Checklist de continuidad

- [ ] Repo clonado desde GitHub.
- [ ] Rama `feat/abre-facil-saas-web` activa.
- [ ] HEAD en `fe33d38` o commit posterior conocido.
- [ ] `backend/npm ci` y `frontend/npm ci` completados.
- [ ] `backend/.env.test` creado desde example.
- [ ] Docker Desktop activo si se correran tests completos.
- [ ] `backend npm run build` pasa.
- [ ] `backend npm test` pasa.
- [ ] `frontend npm run build` pasa.
- [ ] `frontend npm run lint` pasa.
- [ ] Health publico responde 200.
- [ ] Frontend publico responde 200.
- [ ] Accesos a GitHub, Supabase, Render y Vercel confirmados.
- [ ] Secretos recreados desde dashboards o gestor seguro, no desde Git.
