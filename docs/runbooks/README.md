# Collecta runbooks

Runbooks operativos para instalar, levantar, probar y entregar Collecta sin
depender de memoria tribal ni servicios pagados.

## Indice

- [Environment setup](ENVIRONMENT_SETUP.md): instalacion local, Docker, DB de
  test, puertos y comandos base.
- [QA browser script](QA_BROWSER_SCRIPT.md): recorrido manual de rutas criticas
  en escritorio y movil.
- [Secrets and env safety](SECRETS_AND_ENV_SAFETY.md): que archivos no tocar,
  placeholders permitidos y politica de datos.
- [Free platform options](FREE_PLATFORM_OPTIONS.md): opciones Vercel, Render,
  Supabase, Neon, Firebase, n8n y Evolution API con fallback local.
- [Operator handoff](OPERATOR_HANDOFF.md): guia corta para operar, verificar,
  leer logs y escalar login externo.
- [Collecta SaaS web publico](COLLECTA_SAAS_WEB.md): setup, arranque,
  PWA, offline y operacion diaria para despacho.

## Scripts locales

Desde la raiz del repo:

```powershell
.\scripts\collecta-doctor.ps1
.\scripts\collecta-setup.ps1
.\scripts\collecta-start.ps1 -Force
.\scripts\collecta-test.ps1
.\scripts\collecta-dev.ps1
```

Los logs generados por `collecta-dev.ps1` viven en `%TEMP%\collecta-dev`, fuera
del repositorio.
