# Phase 8 Deployment Runbook

Collecta production target:

- Frontend: Vercel.
- Backend: Railway.
- Database: PostgreSQL / Neon.
- Automation: n8n.
- WhatsApp: Evolution API self-hosted when enabled; `wa.me` remains the manual fallback.

## Fresh Clone

Backend:

```bash
cd backend
npm ci
npx prisma generate
npm run build
```

Frontend:

```bash
cd frontend
npm ci
npm run build
```

## Backend Deploy

Required environment variables:

```text
NODE_ENV=production
PORT=<provided by Railway>
DATABASE_URL=<pooled Postgres URL>
DIRECT_URL=<direct Postgres URL>
API_KEY=<random 32+ chars>
JWT_SECRET=<random 32+ chars>
ADMIN_USER=<admin email or username>
ADMIN_PASS=<strong password>
ALLOWED_ORIGINS=https://<frontend-domain>
EVOLUTION_API_URL=<optional>
EVOLUTION_INSTANCE=<optional>
EVOLUTION_API_KEY=<optional>
EVOLUTION_WEBHOOK_SECRET=<optional>
PAYMENT_DETECTION_WEBHOOK_URL=<optional>
GEMINI_API_KEY=<optional>
GROQ_API_KEY=<optional>
OPENROUTER_API_KEY=<optional>
```

Release steps:

1. Confirm CI is green on the commit to deploy.
2. Confirm migrations are committed under `backend/prisma/migrations`.
3. Run migrations against staging: `npx prisma migrate deploy`.
4. Deploy backend to Railway.
5. Confirm `/api/health` returns `{"status":"ok"}`.
6. Confirm CORS accepts the production frontend origin and rejects unapproved origins.
7. Confirm `/api/n8n/pending-collections` returns 401 without auth and 200 with `API_KEY`.
8. Confirm `/api/whatsapp/status` returns a non-secret status payload.

Recommended Railway build/start commands:

```bash
npm ci && npx prisma generate && npm run build
npx prisma migrate deploy && npm start
```

## Frontend Deploy

Required environment variables:

```text
VITE_API_URL=https://<backend-domain>
```

Release steps:

1. Confirm CI frontend build is green.
2. Deploy frontend to Vercel.
3. Confirm the Vercel production domain is listed in backend `ALLOWED_ORIGINS`.
4. Open the production frontend and login with the production admin account.
5. Run client/operation smoke actions and confirm API calls hit the production backend.

## n8n Deploy

Required environment variables:

```text
COLLECTA_API_URL=https://<backend-domain>
API_KEY=<same backend API_KEY>
TELEGRAM_BOT_TOKEN=<optional>
TELEGRAM_CHAT_ID=<optional>
EVOLUTION_API_URL=<optional>
EVOLUTION_INSTANCE=<optional>
EVOLUTION_API_KEY=<optional>
EVOLUTION_WEBHOOK_SECRET=<optional>
GEMINI_API_KEY=<optional>
```

Checks:

- n8n must call Collecta with `Authorization: Bearer <API_KEY>`.
- Evolution webhooks must call `/api/webhooks/evolution` with `X-Webhook-Secret`.
- n8n must not use `localhost` unless backend and n8n share the same runtime network.

## Rollback

Backend rollback:

1. Revert to the previous Railway deployment.
2. Check whether the failed release ran a migration.
3. If data shape changed, restore from database backup or apply a reviewed corrective migration. Do not manually edit production rows without a written recovery note.

Frontend rollback:

1. Promote the previous Vercel deployment.
2. Confirm it still points to the current backend API.

n8n rollback:

1. Disable the failing workflow.
2. Restore the previous workflow version.
3. Re-run only idempotent jobs. For payment detection, check duplicate protection before replay.
