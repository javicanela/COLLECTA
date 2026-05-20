# Free platform options

Revision: 2026-05-20. Los precios y limites cambian; confirmar en la pagina
oficial antes de tomar decisiones de produccion.

## Regla Collecta

- No crear recursos externos sin confirmacion explicita.
- No enviar datos reales de clientes a proveedores externos sin autorizacion.
- Preferir local-first para desarrollo y QA.
- Documentar cuenta requerida, datos enviados y fallback local.

## Vercel frontend

- Uso sugerido: deploy de `frontend/`.
- Disponibilidad gratis: Vercel lista el plan Hobby como gratis para proyectos
  personales y punto de partida. Fuente: <https://vercel.com/pricing>.
- Cuenta requerida: Vercel, normalmente con GitHub/GitLab/Bitbucket.
- Datos enviados: codigo frontend, variables `VITE_*`, assets publicos y logs de
  build/runtime.
- Requiere confirmacion: login, conectar repo, crear proyecto, configurar env,
  deploy/promote/rollback.
- Fallback local: `cd frontend; npm run dev`.

## Render backend puente

- Uso sugerido: backend Express cuando se autorice deploy externo y Railway no
  este disponible.
- Disponibilidad gratis: Render mantiene web services gratis para preview,
  pero advierte que las instancias gratis no deben usarse para produccion y se
  duermen tras inactividad. Fuente: <https://render.com/docs/free>.
- Cuenta requerida: Render; la verificacion puede depender de la cuenta GitHub.
- Datos enviados: codigo backend, logs, variables de entorno, trafico API.
- Requiere confirmacion: login, crear servicio, crear DB, editar env vars,
  deploy/promote/rollback.
- Fallback local: `cd backend; npm run dev` o `.\scripts\collecta-dev.ps1`.

## Railway backend

- Uso sugerido: fallback si el usuario decide reactivar o pagar Railway.
- Estado actual: el trial de la cuenta mostrada por el usuario esta vencido y
  los deploys estan pausados; no usar como default vigente.
- Datos enviados: codigo backend, logs, variables de entorno, trafico API.
- Requiere confirmacion: upgrade/login, crear servicio, editar env vars,
  deploy/promote/rollback.
- Fallback local: `cd backend; npm run dev` o `.\scripts\collecta-dev.ps1`.

## Supabase PostgreSQL y Storage

- Uso sugerido: PostgreSQL oficial para produccion o staging, bucket privado
  para PDFs/adjuntos temporales y Auth opcional.
- Disponibilidad gratis: Supabase mantiene plan Free; el plan Pro es pago.
  Fuente: <https://supabase.com/pricing>.
- Cuenta requerida: Supabase.
- Datos enviados: datos de aplicacion almacenados en Postgres.
- Requiere confirmacion: crear proyecto, copiar connection string, cargar env en
  backend, crear bucket `statement-pdfs`, importar datos.
- Fallback local: `docker-compose.test.yml` o Postgres local.

## Neon PostgreSQL

- Uso sugerido: fallback de DB si Supabase bloquea la cuenta, region o cuotas.
- Disponibilidad gratis: confirmar en la pagina oficial antes de crear recursos.
  Fuente: <https://neon.com/pricing>.
- Cuenta requerida: Neon.
- Datos enviados: datos de aplicacion almacenados en Postgres.
- Requiere confirmacion: crear proyecto, copiar connection string, cargar env en
  backend, importar datos.
- Fallback local: `docker-compose.test.yml` o Postgres local.

## Firebase

- Uso sugerido: solo si se decide usar Auth, Hosting, FCM o analytics fuera del
  stack actual.
- Disponibilidad gratis: Firebase Spark es un plan sin costo y sin metodo de
  pago para muchos productos, con cuotas. Fuente:
  <https://firebase.google.com/pricing>.
- Cuenta requerida: Google/Firebase.
- Datos enviados: identidad, eventos, storage o hosting segun producto usado.
- Requiere confirmacion: crear proyecto, activar productos, configurar SDK/env.
- Fallback local: auth/backend actual; no es dependencia vigente de Collecta.

## n8n

- Uso sugerido: automatizaciones de cobranza, reportes y webhooks.
- Disponibilidad gratis: n8n Community Edition self-host incluye casi todo el
  set de funciones excepto capacidades enterprise/cloud especificas. Fuente:
  <https://docs.n8n.io/hosting/community-edition-features/>.
- Cuenta requerida: ninguna para self-host local; cuenta n8n si se usa cloud.
- Datos enviados: workflows, credenciales, payloads de automatizacion, logs.
- Requiere confirmacion: cloud login, importar workflows con credenciales,
  activar workflows productivos.
- Fallback local: self-host Docker/local y pruebas manuales con curl.

## Evolution API

- Uso sugerido: WhatsApp programatico solo si self-host no implica costo de
  servicio; `wa.me` queda como fallback manual.
- Disponibilidad gratis: Evolution API es open source y puede ejecutarse con
  Docker; WhatsApp Cloud API oficial puede tener costos por Meta. Fuente:
  <https://github.com/EvolutionAPI/evolution-api>.
- Cuenta requerida: ninguna para Baileys/self-host; Meta Business si se usa
  WhatsApp Cloud API oficial.
- Datos enviados: mensajes, telefonos, adjuntos y eventos de WhatsApp.
- Requiere confirmacion: levantar servicio externo, conectar numero real, usar
  API oficial, enviar mensajes reales.
- Fallback local/manual: links `wa.me` y aprobaciones manuales.
