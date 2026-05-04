# Phase 8 QA Checklist

Use this checklist before merging or deploying Collecta.

## CI Gates

- [ ] Backend dependencies install with `npm ci`.
- [ ] Backend Prisma client generates with `npx prisma generate`.
- [ ] Backend builds with `npm run build`.
- [ ] Backend tests pass with `npm test`.
- [ ] Frontend dependencies install with `npm ci`.
- [ ] Frontend tests pass with `npm test` when frontend tests exist.
- [ ] Frontend builds with `npm run build`.

## Smoke Coverage

- [ ] Login: `/api/auth/login` returns a JWT for valid admin credentials.
- [ ] Auth verify: `/api/auth/verify` accepts the JWT.
- [ ] Clients: `/api/clients` rejects missing auth and supports create/list with auth.
- [ ] Operations: `/api/operations` rejects missing auth and supports create/list with auth.
- [ ] Import analyze/commit: `/api/import/batch` maps rows deterministically with `provider=regex` and creates client/operation records.
- [ ] n8n protected route: `/api/n8n/pending-collections` rejects missing auth and returns collections with API auth.
- [ ] WhatsApp status: `/api/whatsapp/status` returns configured/connected state without leaking provider secrets.
- [ ] Payment detection: exact/tolerated payments are accepted, unsafe matches require review, duplicate receipts are idempotent.

## Production Readiness

- [ ] `DATABASE_URL` points to the pooled production PostgreSQL/Neon URL.
- [ ] `DIRECT_URL` points to the direct production PostgreSQL/Neon URL for migrations.
- [ ] `API_KEY` is at least 32 random characters and differs from local/dev.
- [ ] `JWT_SECRET` is at least 32 random characters and differs from local/dev.
- [ ] `ADMIN_USER` and `ADMIN_PASS` are set in backend hosting secrets.
- [ ] `ALLOWED_ORIGINS` includes only the production Vercel domain and approved admin domains.
- [ ] `EVOLUTION_API_URL`, `EVOLUTION_INSTANCE`, `EVOLUTION_API_KEY`, `EVOLUTION_WEBHOOK_SECRET` are set only if Evolution API is enabled.
- [ ] `PAYMENT_DETECTION_WEBHOOK_URL` is set only if image payment detection is routed through n8n.
- [ ] `GEMINI_API_KEY`, `GROQ_API_KEY`, and `OPENROUTER_API_KEY` are optional and provider-specific; no key is stored in Git.
- [ ] Prisma migrations are committed and `npx prisma migrate deploy` runs successfully against a staging database.
- [ ] Rate limits are reviewed for production traffic: global API limit and extract/import AI limit.
- [ ] Backend logs include request method, path, status, duration, and request id.
- [ ] Operators know how to inspect Railway logs, Vercel deployment logs, n8n workflow executions, Evolution API logs, and database records.

## Manual Release Smoke

- [ ] Open frontend production URL.
- [ ] Login as admin.
- [ ] Create a disposable client.
- [ ] Create a disposable operation.
- [ ] Run a small import file or `/api/import/batch` payload.
- [ ] Call `/api/n8n/pending-collections` with `Authorization: Bearer <API_KEY>`.
- [ ] Call `/api/whatsapp/status` from the backend environment.
- [ ] Confirm no unexpected 5xx errors in backend logs during smoke.
