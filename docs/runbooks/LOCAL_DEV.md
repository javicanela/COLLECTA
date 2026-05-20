# Collecta Entorno Tecnico Interno

## Objetivo

Ejecutar Collecta en entorno local solo para construir, probar y depurar la
version final SaaS. Este archivo no define una segunda version del producto ni
un camino distribuible para despachos contables.

La unica version final es la URL publica multi-tenant descrita en
`docs/runbooks/COLLECTA_SAAS_WEB.md`.

## Requisitos

- Node.js y npm instalados.
- Docker Desktop recomendado para la base local de prueba.
- Puertos locales libres: `3001` para backend y `5173` para frontend.
- No usar `.env` productivos para pruebas locales.

## Instalacion inicial

Desde la raiz del repo:

```powershell
.\scripts\collecta-setup.ps1
```

El script:

- copia `backend\.env.test.example` a `backend\.env.test` si falta;
- instala dependencias de backend y frontend si faltan;
- prepara la base local segura con `backend npm run test:prepare`;
- ejecuta `collecta-doctor` para mostrar bloqueos accionables.

Si Docker no esta disponible pero ya existe una DB local segura, puede omitirse
la preparacion automatica:

```powershell
.\scripts\collecta-setup.ps1 -SkipDbPrepare
```

## Inicio diario

```powershell
.\scripts\collecta-start.ps1 -Force
```

El script ejecuta doctor, inicia backend/frontend y abre:

```text
http://localhost:5173/
```

Para detener los procesos:

```powershell
.\scripts\collecta-stop.ps1
```

## Flujo tecnico de prueba interna

1. Abrir Collecta en `http://localhost:5173/`.
2. Iniciar sesion con credenciales locales configuradas.
3. Entrar a `Registros`.
4. Arrastrar o seleccionar archivo CSV, Excel, PDF, DOCX, JSON, XML o imagen.
5. Revisar hoja, region detectada, mapeo editable y preview canonico.
6. Ajustar columnas con baja confianza o filas bloqueadas.
7. Confirmar carga cuando Collecta este conectado.
8. Entrar a cartera para revisar operaciones vencidas y pendientes.
9. Contactar por WhatsApp manual usando `wa.me` cuando aplique.
10. Marcar pagos revisados.
11. Exportar reporte desde `Exportar`.

## Verificacion PWA en entorno interno

En navegador compatible:

1. Abrir `http://localhost:5173/`.
2. Usar la accion del navegador para instalar app.
3. Abrir Collecta desde el acceso instalado.

Collecta incluye `manifest.webmanifest` y `service-worker.js`. El service
worker conserva el shell y assets visitados para que la app no quede rota al
recargar sin conexion.

## Modo offline en pruebas internas

Offline permite:

- abrir el shell instalado o previamente cacheado;
- entrar a Smart Import;
- cargar archivo local;
- analizar en navegador;
- revisar y corregir mapeo;
- conservar un borrador temporal del import en `localStorage`.

Offline no permite:

- sincronizar cartera compartida;
- crear clientes u operaciones en backend;
- enviar o confirmar cobranza;
- refrescar dashboards desde PostgreSQL/Supabase;
- generar reportes con datos no cacheados.

Cuando no hay conexion, Smart Import muestra:

```text
Listo para sincronizar cuando Collecta este conectado
```

La carga final se habilita al recuperar conexion/API.

## Verificacion recomendada

```powershell
.\scripts\collecta-test.ps1
```

Checks manuales:

- instalar PWA desde navegador;
- cargar `/` online;
- simular offline y recargar;
- entrar a Smart Import offline;
- cargar archivo local y llegar a preview;
- volver online y confirmar commit;
- revisar cartera;
- usar WhatsApp manual;
- marcar pago;
- exportar reporte.

## Limites honestos

- Este modo no es una version paralela ni una opcion para clientes.
- Todo hallazgo aqui debe corregir la version final SaaS publica.
- El offline actual prepara imports y conserva shell, no implementa cartera
  local completa.
- Las operaciones compartidas requieren backend y DB.
- WhatsApp programatico sigue opcional; el fallback manual `wa.me` es suficiente
  para la version inicial.
