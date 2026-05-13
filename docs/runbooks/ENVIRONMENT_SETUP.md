# Environment setup

Collecta corre localmente con frontend Vite, backend Express y PostgreSQL de
test. La ruta recomendada es local-first: primero Docker/Postgres local, luego
plataformas externas solo con confirmacion explicita.

## Requisitos

- Windows PowerShell.
- Node.js y npm disponibles en `PATH`.
- Docker Desktop si quieres que el repo levante `collecta-test-postgres`.
- Dependencias instaladas:

```powershell
cd frontend
npm install
cd ..\backend
npm install
```

## Variables locales

No edites ni subas secretos reales. Usa ejemplos con placeholders:

- Backend local: copiar `backend\.env.example` a `backend\.env` solo en tu
  maquina.
- Backend test: copiar `backend\.env.test.example` a `backend\.env.test`.
- Frontend: `frontend\.env.example` ya apunta a
  `VITE_API_URL=http://localhost:3001/api`.

Los archivos `.env`, `.env.test`, `.env.local` y `.env.production` estan
ignorados por Git.

## Base de datos de test

El flujo oficial de test usa `docker-compose.test.yml`:

```powershell
cd backend
npm run test:prepare
```

Ese comando:

- Valida que `DATABASE_URL` parezca local/test/e2e.
- Intenta conectar a `localhost:5432`.
- Si no hay Postgres y Docker esta disponible, levanta
  `collecta-test-postgres`.
- Ejecuta `prisma db push --skip-generate` contra la DB de test.

Para ver el contenedor:

```powershell
docker compose -f docker-compose.test.yml ps
```

## Levantar Collecta

Desde la raiz:

```powershell
.\scripts\collecta-dev.ps1
```

El script prepara DB de test, arranca backend y frontend, imprime PIDs, URLs y
logs:

- Backend: `http://localhost:3001/api`
- Frontend: `http://localhost:5173/`
- Logs: `%TEMP%\collecta-dev`

Para detener procesos iniciados por el script, usa el comando que imprime al
final o:

```powershell
Get-Content "$env:TEMP\collecta-dev\collecta-dev-pids.txt" |
  ForEach-Object {
    if ($_ -match '=(\d+)$') {
      Stop-Process -Id $Matches[1] -ErrorAction SilentlyContinue
    }
  }
```

## Probar Collecta

Ruta completa:

```powershell
.\scripts\collecta-test.ps1
```

Comandos crudos equivalentes:

```powershell
cd frontend
npm run build
npm test
cd ..\backend
npm run build
npm run test:full
```

## Puertos

- Backend: `3001`
- Frontend: `5173`
- Postgres test: `5432`

Antes de arrancar, valida:

```powershell
.\scripts\collecta-doctor.ps1
```

## Problemas comunes

| Sintoma | Revision |
|---|---|
| `DATABASE_URL is required` | Copia `backend\.env.test.example` a `backend\.env.test`. |
| `Refusing to prepare` | La URL no parece local/test/e2e. No fuerces produccion. |
| Puerto `3001` ocupado | Deten backend previo o cambia el proceso que usa ese puerto. |
| Vite no abre | Revisa `%TEMP%\collecta-dev\frontend.err.log`. |
| Backend no responde | Revisa `%TEMP%\collecta-dev\backend.err.log` y `backend\.env.test`. |
