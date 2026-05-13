# Operator handoff

Esta guia es la ruta corta para que otra persona levante, pruebe e inspeccione
Collecta.

## Inicio local

1. Instalar dependencias si faltan:

```powershell
cd frontend
npm install
cd ..\backend
npm install
cd ..
```

2. Verificar prerequisitos:

```powershell
.\scripts\collecta-doctor.ps1
```

3. Levantar app:

```powershell
.\scripts\collecta-dev.ps1
```

4. Abrir:

```text
http://localhost:5173/
```

## Tests

Ruta completa:

```powershell
.\scripts\collecta-test.ps1
```

Ruta manual:

```powershell
cd frontend
npm run build
npm test
cd ..\backend
npm run build
npm run test:full
```

## Logs locales

`collecta-dev.ps1` escribe fuera del repo:

```text
%TEMP%\collecta-dev\backend.out.log
%TEMP%\collecta-dev\backend.err.log
%TEMP%\collecta-dev\frontend.out.log
%TEMP%\collecta-dev\frontend.err.log
```

No pegues logs completos si contienen tokens, URLs firmadas, datos de clientes o
payloads privados.

## Flujos a verificar

- Importacion: `/registros`, cargar archivo demo no sensible, revisar mapping y
  preview antes de confirmar.
- Cobranza: `/`, seleccionar operacion, revisar prioridad, estado y acciones.
- Pagos: `/pagos/revision`, revisar candidatos, evidencia y confianza.
- Diagnostico: `/sistema/diagnostico`, ejecutar checks y distinguir health
  liviano de readiness protegido.
- Logs: `/logs`, verificar eventos generados por acciones manuales o tests.

## Detener servicios

Usa el comando que imprime `collecta-dev.ps1` o:

```powershell
Get-Content "$env:TEMP\collecta-dev\collecta-dev-pids.txt" |
  ForEach-Object {
    if ($_ -match '=(\d+)$') {
      Stop-Process -Id $Matches[1] -ErrorAction SilentlyContinue
    }
  }
```

Si Docker levanto Postgres de test y quieres detenerlo:

```powershell
docker compose -f docker-compose.test.yml stop postgres
```

No borres volumenes sin confirmar, porque eso elimina la DB local de test.

## Cuando escalar

Pedir confirmacion antes de:

- Login en Railway, Vercel, Supabase, Neon, Firebase, n8n, Evolution API o
  GitHub.
- Crear recursos externos.
- Editar variables de entorno alojadas.
- Deploy, promote, rollback o delete.
- Conectar WhatsApp real o enviar mensajes reales.
- Subir datos reales de clientes.

Si una plataforma pide login, abrir la pagina y dejar al usuario continuar.
