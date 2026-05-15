# Backend test:full - entorno local seguro

## 1. Problema que resuelve

`npm run test:full` ejecuta suites de integracion que preparan una base
PostgreSQL, aplican Prisma y pueden escribir datos. Este flujo no debe tocar
Neon, Supabase, Railway, staging, produccion, WhatsApp real, email real, AI real
ni proveedores de pago reales.

## 2. Crear `.env.test`

Desde `backend`:

```bash
cp .env.test.example .env.test
```

`.env.test` esta ignorado por Git. No guardes secretos reales en ese archivo.

## 3. Valores requeridos

Variables minimas:

- `NODE_ENV=test`
- `DATABASE_URL=postgresql://collecta:collecta@localhost:5432/collecta_test?schema=public`
- `DIRECT_URL=postgresql://collecta:collecta@localhost:5432/collecta_test?schema=public`
- `API_KEY`, `JWT_SECRET`, `ADMIN_USER`, `ADMIN_PASS`
- `ALLOWED_ORIGINS=http://localhost:5173`
- `LOG_LEVEL=silent`
- Integraciones externas en blanco: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`,
  `PAYMENT_DETECTION_WEBHOOK_URL`, `PAYMENT_DETECTION_WEBHOOK_TOKEN`,
  `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`

## 4. Bases permitidas

El guard acepta hosts locales o nombres claramente de test:

- `localhost`, `127.0.0.1`, `::1`
- `collecta-test-postgres`, `postgres`, `db`
- host, usuario o base con marcador `test`, `e2e`, `local`, `_test` o `-test`

## 5. Valores prohibidos

No uses URLs ni credenciales de:

- Neon, Supabase, Railway, AWS RDS, Azure, Render, Vercel, PlanetScale, Heroku
- produccion o staging
- WhatsApp/Evolution real
- Gemini, Groq, OpenRouter o webhooks de pago reales

## 6. Verificacion previa

Antes de `test:full`, ejecuta:

```bash
npm run db:guard
```

Debe terminar con `OK`. Si falla, corrige `.env.test` y no ejecutes pruebas
full.

## 7. Comandos

```bash
npm run test
npm run build
npm run test:full
```

`test:full` ejecuta `test:prepare`, y `test:prepare` corre primero
`npm run db:guard`, luego `scripts/ensure-test-db.js` y finalmente
`prisma db push --skip-generate`.

## 8. Cuando NO correr `test:full`

No lo ejecutes si falta `.env.test`, si `DATABASE_URL` no es local/test, si
hay credenciales reales en variables externas, si no sabes que Postgres esta
escuchando en `localhost:5432`, o si el entorno podria apuntar a una base
compartida.

## 9. Protecciones existentes

- `src/lib/dbSafety.ts::evaluateTestDbSafety`
- `scripts/assert-safe-test-db.ts` via `npm run db:guard`
- `scripts/ensure-test-db.js`, que repite la validacion antes de preparar DB
- `.env.test.example` mantiene proveedores externos vacios para forzar
  cortocircuitos/mocks en tests
