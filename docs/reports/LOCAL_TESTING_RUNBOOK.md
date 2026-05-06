# Collecta Local Testing Runbook

Guia operativa para correr la suite local con PostgreSQL 16, Prisma y Vitest.
No requiere secretos reales y no modifica `.env`.

## Archivos de soporte

- `docker-compose.test.yml`: levanta PostgreSQL 16 en `localhost:5432`.
- `backend/.env.test.example`: plantilla de variables locales de prueba.
- `backend/.env.test`: copia local ignorada por Git, creada por cada dev.

## Preparacion inicial

Desde la raiz del repo:

```bash
cp backend/.env.test.example backend/.env.test
```

En Windows PowerShell:

```powershell
Copy-Item backend\.env.test.example backend\.env.test
```

La URL de prueba esperada por defecto es:

```text
postgresql://collecta:collecta@localhost:5432/collecta_test?schema=public
```

`DATABASE_URL` y `DIRECT_URL` deben existir. Prisma valida el schema contra
ambas variables porque `backend/prisma/schema.prisma` define `directUrl`.

## Levantar PostgreSQL local

Desde la raiz:

```bash
docker compose -f docker-compose.test.yml up -d
```

Confirmar estado:

```bash
docker compose -f docker-compose.test.yml ps
```

Si el puerto `5432` ya esta ocupado, deten el servicio local que lo usa o cambia
temporalmente el puerto publicado en `docker-compose.test.yml` y actualiza
`backend/.env.test` con el mismo puerto.

## Backend

Instalar dependencias:

```bash
cd backend
npm ci
```

Validar Prisma:

```bash
npx prisma validate
```

Si ejecutas `npx prisma validate` sin variables exportadas y sin `.env`, fallara
por `DATABASE_URL` o `DIRECT_URL`. Para validar usando la plantilla local:

```bash
node --env-file=.env.test ./node_modules/prisma/build/index.js validate
```

Preparar schema en PostgreSQL:

```bash
npm run db:test:push
```

Compilar:

```bash
npm run build
```

Smoke test backend:

```bash
npm run test:smoke
```

Tests de integracion backend:

```bash
npm run test:integration
```

Suite backend completa:

```bash
npm run test:full
```

Los scripts `db:test:push`, `test:smoke`, `test:integration` y `test:full`
cargan `backend/.env.test` si existe. En CI usan las variables definidas por el
workflow.

## Frontend

Desde la raiz:

```bash
cd frontend
npm ci
npm test
npm run build
```

## CI

El workflow `.github/workflows/ci.yml` levanta PostgreSQL 16 como servicio y
define:

- `DATABASE_URL=postgresql://collecta:collecta@localhost:5432/collecta_test?schema=public`
- `DIRECT_URL=postgresql://collecta:collecta@localhost:5432/collecta_test?schema=public`

Luego ejecuta `npx prisma validate`, `npm run db:test:push`, build backend y
`npm run test:full`.

## Reset de base local

Para borrar datos y volumen local de pruebas:

```bash
docker compose -f docker-compose.test.yml down -v
docker compose -f docker-compose.test.yml up -d
cd backend
npm run db:test:push
```

## Bloqueos comunes

| Sintoma | Causa probable | Accion |
|---|---|---|
| `Environment variable not found: DIRECT_URL` | Falta `DIRECT_URL` en el entorno usado por Prisma. | Copiar `backend/.env.test.example` a `backend/.env.test` o exportar `DIRECT_URL`. |
| `Can't reach database server at localhost:5432` | PostgreSQL no esta levantado o el puerto no coincide. | Ejecutar `docker compose -f docker-compose.test.yml up -d` y revisar `ps`. |
| Puerto `5432` ocupado | Ya hay otro PostgreSQL local. | Detenerlo o cambiar el puerto publicado y las URLs en `.env.test`. |
| Tests de API fallan al limpiar datos | El schema no fue aplicado. | Ejecutar `npm run db:test:push`. |
| Docker Desktop muestra `Virtualization support not detected` | La virtualizacion esta deshabilitada en BIOS/UEFI o no hay virtualizacion anidada. | Habilitar Intel VT-x/Virtualization Technology en BIOS/UEFI y reiniciar. Despues confirmar con `Get-CimInstance Win32_Processor | Select-Object VirtualizationFirmwareEnabled`. |
| Docker CLI no encuentra `dockerDesktopLinuxEngine` | Docker Desktop no arranco su backend WSL 2. Puede ocurrir despues de habilitar WSL/Ubuntu. | Ejecutar `wsl --shutdown`, abrir Docker Desktop otra vez y esperar `docker info`. |
| `wsl --list --verbose` no muestra distribuciones | WSL esta habilitado pero no hay distro Linux instalada. | Instalar Ubuntu con `wsl --install -d Ubuntu`, reiniciar si Windows lo pide y volver a abrir Docker Desktop. |

## Diagnostico de Docker Desktop en Windows

Comandos utiles:

```powershell
Get-CimInstance Win32_Processor |
  Select-Object Name,VirtualizationFirmwareEnabled,SecondLevelAddressTranslationExtensions,VMMonitorModeExtensions

Get-CimInstance Win32_ComputerSystem |
  Select-Object Manufacturer,Model,SystemType,HypervisorPresent

wsl --status
```

Para Docker Desktop con backend WSL 2, Docker requiere virtualizacion de
hardware habilitada en BIOS/UEFI, CPU de 64 bits con SLAT, WSL 2 y Windows
compatible. En equipos Lenovo, la opcion suele estar en BIOS/UEFI bajo
`Security > Virtualization > Intel Virtualization Technology` o una ruta similar.

Si la virtualizacion ya fue habilitada en BIOS/UEFI pero Docker no arranca,
reiniciar WSL y Docker suele resolver el estado intermedio:

```powershell
wsl --shutdown
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
docker info
```
