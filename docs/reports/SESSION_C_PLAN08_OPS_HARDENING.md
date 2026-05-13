# Session C - Plan 08 Ops Hardening Brief

## Contexto en frio

Eres una sesion paralela de Claude Code (de 3). Tu sola responsabilidad es
endurecer scripts de operacion locales y agregar guards de seguridad de DB
y semilla demo. NO toques codigo de auth (Sesion B) ni de cobranza/webhooks
(Sesion A).

Antes de empezar:

1. Lee `AGENTS.md`.
2. Lee `docs/reports/PLAN_CIERRE_TRIPLE_PARALELO.md`.
3. Lee `docs/reports/AGENT_HANDOFF_PLAN_08_INSTALLATION_OPERATIONS_READINESS.md`.
4. Lee `docs/reports/INSTALLATION_OPERATIONS_QA_RESULTS.md`.
5. Lee `scripts/collecta-doctor.ps1`, `scripts/collecta-dev.ps1`,
   `scripts/collecta-test.ps1` para entender el estado actual.

## Rama y worktree

```powershell
git worktree add ..\collecta-C-ops-hardening -b codex/plan08-ops-hardening
cd ..\collecta-C-ops-hardening
```

## Archivos exclusivos (solo tu)

- `scripts/collecta-doctor.ps1`
- `scripts/collecta-dev.ps1`
- `scripts/collecta-test.ps1`
- `scripts/collecta-stop.ps1` (nuevo)
- `backend/scripts/assert-safe-test-db.ts` (nuevo)
- `backend/scripts/seed-demo-data.ts` (nuevo)
- `backend/src/__tests__/safeTestDbGuard.test.ts` (nuevo)
- `docs/reports/INSTALLATION_OPERATIONS_QA_RESULTS.md`
- `docs/runbooks/SEED_DEMO_DATA.md` (nuevo si aplica)

Posiblemente:
- `backend/package.json` SOLO si necesitas registrar nuevos scripts npm
  (`db:seed`, `db:guard`).

## Bugs a parchar

### Bug 14 - Doctor no prueba conectividad real a Postgres
Archivo: `scripts/collecta-doctor.ps1`

Agrega chequeo TCP a `127.0.0.1:5432` ademas del status del contenedor.

```powershell
function Test-TcpReachable {
  param([string]$HostName, [int]$Port, [int]$TimeoutMs = 1500)
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect($HostName, $Port, $null, $null)
    if ($iar.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) {
      $client.EndConnect($iar)
      $client.Close()
      return $true
    }
    $client.Close()
    return $false
  } catch {
    return $false
  }
}

if (Test-TcpReachable "127.0.0.1" 5432) {
  Write-Check "Postgres TCP" "OK" "127.0.0.1:5432 alcanzable"
} else {
  Write-Check "Postgres TCP" "WARNING" "127.0.0.1:5432 no responde"
  Add-Warning "Postgres no responde en 5432. Inicia el contenedor o tu instancia local."
}
```

### Bug 15 - Doctor no avisa de .env.test faltante
Archivo: `scripts/collecta-doctor.ps1`

```powershell
$envTest = Join-Path $repoRoot "backend\.env.test"
if (Test-Path $envTest) {
  Write-Check "backend/.env.test" "OK"
  $required = @('DATABASE_URL','JWT_SECRET','API_KEY','ADMIN_USER','ADMIN_PASS')
  $contentLines = Get-Content $envTest
  foreach ($key in $required) {
    if (-not ($contentLines -match "^$key=")) {
      Add-Warning "backend/.env.test no define $key"
    }
  }
} else {
  Write-Check "backend/.env.test" "MISSING"
  Add-Issue "Falta backend/.env.test. Sin el, npm run test:prepare falla."
}
```

NO imprimir valores de variables. Solo presencia/ausencia.

### Bug 16 - collecta-dev sin -Force para matar PIDs previos
Archivo: `scripts/collecta-dev.ps1`

Agrega parametro `-Force`. Cuando esta presente, lee el viejo `pidFile` y
mata procesos antes de arrancar nuevos.

```powershell
param(
  [int]$BackendPort = 3001,
  [int]$FrontendPort = 5173,
  [switch]$Force
)
# ...
if ($Force -and (Test-Path $pidFile)) {
  Get-Content $pidFile | ForEach-Object {
    if ($_ -match '=(\d+)$') {
      Stop-Process -Id $Matches[1] -ErrorAction SilentlyContinue
    }
  }
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}
```

### Bug 17 - collecta-dev no espera readiness
Archivo: `scripts/collecta-dev.ps1`

Despues de arrancar backend, hacer poll de `http://localhost:$BackendPort/api/health`
hasta 30s antes de declarar readiness y arrancar frontend.

```powershell
function Wait-HttpReady {
  param([string]$Url, [int]$TimeoutSec = 30)
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
      if ($r.StatusCode -lt 500) { return $true }
    } catch { Start-Sleep -Milliseconds 500 }
  }
  return $false
}

Write-Host "[collecta-dev] Esperando backend en /api/health"
$ready = Wait-HttpReady "http://localhost:$BackendPort/api/health" 30
if (-not $ready) {
  Write-Warning "Backend no respondio a /api/health en 30s. El frontend arrancara igual."
}
```

### Bug 18 - Falta backend/scripts/assert-safe-test-db.ts
Archivo nuevo: `backend/scripts/assert-safe-test-db.ts`

```ts
const url = process.env.DATABASE_URL || '';
if (!url) {
  console.error('[assert-safe-test-db] DATABASE_URL vacio');
  process.exit(2);
}

const lower = url.toLowerCase();
const allowedHosts = ['localhost', '127.0.0.1', 'collecta-test-postgres'];
const looksProd = /(neon|railway|supabase|heroku|amazonaws|azure|render)/.test(lower);
const hasAllowedHost = allowedHosts.some(h => lower.includes(`@${h}`) || lower.includes(`@${h}:`));
const hasTestMarker = lower.includes('test') || (process.env.NODE_ENV === 'test');

if (looksProd) {
  console.error('[assert-safe-test-db] DATABASE_URL parece de produccion. Abort.');
  process.exit(2);
}
if (!hasAllowedHost && !hasTestMarker) {
  console.error('[assert-safe-test-db] DATABASE_URL no apunta a host local ni marca test. Abort.');
  process.exit(2);
}

console.log('[assert-safe-test-db] OK - DB segura para operaciones destructivas locales.');
process.exit(0);
```

Test en `backend/src/__tests__/safeTestDbGuard.test.ts`: usar `child_process`
o factorizar la logica a un export puro (`isSafeTestDbUrl(url, env)`) y
testear cada caso (Neon URL => unsafe, localhost => safe, etc.).

Recomendado: factorizar a export puro:

```ts
// backend/scripts/assert-safe-test-db.ts
export function evaluateTestDbSafety(url: string, env: NodeJS.ProcessEnv) {
  // ... logica
  return { safe: boolean, reason: string };
}
```

Y mantener un main que llama y `process.exit`.

### Bug 19 - Falta backend/scripts/seed-demo-data.ts
Archivo nuevo: `backend/scripts/seed-demo-data.ts`

Idempotente, usa `upsert` por RFC. Crea 10 clientes demo y 10 operaciones.
Llama `assertSafeTestDb` antes de tocar DB.

```ts
import { PrismaClient } from '@prisma/client';
import { evaluateTestDbSafety } from './assert-safe-test-db';

async function main() {
  const safety = evaluateTestDbSafety(process.env.DATABASE_URL || '', process.env);
  if (!safety.safe) {
    console.error('[seed-demo-data] Abort:', safety.reason);
    process.exit(2);
  }

  const prisma = new PrismaClient();
  const clients = [
    { rfc: 'DEMO010101AAA', nombre: 'Demo Cliente 01', telefono: '5215555550101', email: 'demo01@example.com' },
    // ... 10 totales
  ];

  for (const c of clients) {
    const cli = await prisma.client.upsert({
      where: { rfc: c.rfc },
      update: c,
      create: c,
    });
    await prisma.operation.upsert({
      where: { id: `seed-op-${c.rfc}` },
      update: {},
      create: {
        id: `seed-op-${c.rfc}`,
        clientId: cli.id,
        tipo: 'HONORARIOS',
        descripcion: 'Operacion demo',
        monto: 1500,
        fechaVence: new Date(Date.now() + 7 * 86400000),
        estatus: 'PENDIENTE',
      },
    });
  }
  console.log('[seed-demo-data] OK - 10 clientes y 10 operaciones demo upserted.');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
```

Verifica nombres de campos contra `backend/prisma/schema.prisma` (solo
lectura). Si los campos difieren, ajusta el script (no el schema).

Registra script en `backend/package.json`:

```json
"scripts": {
  "db:guard": "ts-node backend/scripts/assert-safe-test-db.ts",
  "db:seed": "ts-node backend/scripts/seed-demo-data.ts"
}
```

Si `ts-node` no esta disponible, usa `tsx` (ya puede estar). Verifica primero.

### Bug 20 - INSTALLATION_OPERATIONS_QA_RESULTS.md en stub
Archivo: `docs/reports/INSTALLATION_OPERATIONS_QA_RESULTS.md`

Reemplaza con un reporte real ejecutado:

```
# Installation operations QA results

Rama: codex/plan08-ops-hardening
Fecha: <hoy>

## Verificacion plan 08 hardening

| Comando | Resultado |
|---|---|
| .\scripts\collecta-doctor.ps1 | <PASS/FAIL + resumen> |
| .\scripts\collecta-test.ps1 | <PASS/FAIL + resumen> |
| backend\scripts\assert-safe-test-db.ts (modo localhost) | <salida> |
| backend\scripts\assert-safe-test-db.ts (modo neon mock) | <salida> |
| npm run db:seed | <salida resumida> |

## Browser QA
<pendiente o ejecutado con guion>

## Notas
<limites, gaps>
```

### Bug 21 - Falta collecta-stop.ps1
Archivo nuevo: `scripts/collecta-stop.ps1`

```powershell
$ErrorActionPreference = "Continue"
$logDir = Join-Path $env:TEMP "collecta-dev"
$pidFile = Join-Path $logDir "collecta-dev-pids.txt"

if (-not (Test-Path $pidFile)) {
  Write-Host "[collecta-stop] No hay PID file en $pidFile. Nada que detener."
  exit 0
}

Get-Content $pidFile | ForEach-Object {
  if ($_ -match '^(.+)=(\d+)$') {
    $name = $Matches[1]; $procId = [int]$Matches[2]
    try {
      Stop-Process -Id $procId -ErrorAction Stop
      Write-Host "[collecta-stop] $name (PID $procId) detenido."
    } catch {
      Write-Host "[collecta-stop] $name (PID $procId) ya no estaba activo."
    }
  }
}

Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
Write-Host "[collecta-stop] OK."
```

## Verificacion

```powershell
.\scripts\collecta-doctor.ps1
.\scripts\collecta-test.ps1
.\scripts\collecta-dev.ps1 -Force
.\scripts\collecta-stop.ps1

cd backend
npm run db:guard
npm run db:seed
npm run test:full
```

Esperado: cada comando con salida exitosa o warning explicito.

## Entregable

Actualizar `docs/reports/INSTALLATION_OPERATIONS_QA_RESULTS.md` con
resultados reales y crear:

- `docs/reports/SESSION_C_OPS_HARDENING_RESULTS.md` con bugs cerrados,
  diferidos, riesgos.

## Reglas

- No tocar `.env`.
- No commit/push sin pedido.
- No tocar `schema.prisma`.
- No tocar codigo de auth, webhooks ni paymentDetection.
- Si los nombres de campo en Prisma no coinciden con los asumidos en el
  seed, ajusta el seed, no el schema.

## Referencias

- `~/skills/nodebestpractices/sections/production/` para patrones de ops.
- `~/skills/quick-SQL-cheatsheet/` para queries de seed.
- `~/skills/30-seconds-of-code/content/snippets/js/s/sleep.md` (poll/wait).
- Plan 08 spec: `docs/reports/AGENT_HANDOFF_PLAN_08_INSTALLATION_OPERATIONS_READINESS.md`.
