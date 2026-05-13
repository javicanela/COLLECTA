# Auth Platform Setup Runbook

Date: 2026-05-13
Product: Collecta

## Local Auth

Local development and tests continue to use:

- `ADMIN_USER`
- `ADMIN_PASS`
- `JWT_SECRET`

Flow:

1. Start the backend.
2. Start the frontend with `VITE_API_URL=http://localhost:3001/api`.
3. Log in from the Collecta login screen with the configured admin credentials.
4. The backend returns a local JWT with `authSource: local`.

Do not remove the local admin path until a full hosted provider flow is verified.

## Service Auth

n8n and internal automations continue to use:

- `API_KEY`

Service calls must send:

```http
Authorization: Bearer <API_KEY>
```

The backend maps this to `role: service` and `authSource: api_key`. This path is separate from human OAuth and must remain stable for n8n.

## Supabase Auth Setup

Expected backend env names:

- `SUPABASE_URL`
- `SUPABASE_JWT_SECRET` or `SUPABASE_JWKS_URL`

Expected frontend env names:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Current implementation supports `SUPABASE_JWT_SECRET` verification. `SUPABASE_JWKS_URL` is documented as the production-ready direction if the project moves to JWKS verification later.

## Callback Checklist

Before enabling provider login, confirm:

- Supabase project is on the intended free tier.
- Frontend production URL is known.
- Local callback URL is allowed: `http://localhost:5173`.
- Production callback URL is allowed: the final Vercel frontend URL.
- Google OAuth or any other provider is created only after user confirmation.
- No callback URL is changed in a hosted provider without user confirmation.

## Vercel Checklist

Add only after approval:

- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Never add backend-only secrets to the frontend.

## Railway Checklist

Add only after approval:

- `JWT_SECRET`
- `ADMIN_USER`
- `ADMIN_PASS`
- `API_KEY`
- `SUPABASE_URL`
- `SUPABASE_JWT_SECRET` or `SUPABASE_JWKS_URL`

Keep `API_KEY` aligned with n8n.

## Manual Steps Remaining

User approval is still required to:

- Log in to Supabase.
- Create or select a Supabase project.
- Confirm free-tier constraints.
- Create OAuth provider credentials.
- Configure callback URLs.
- Set hosted env vars.
- Run a real provider login against a hosted project.

## Never Commit

- `.env`
- Real JWT secrets
- Real API keys
- Supabase anon key if the user treats it as private in this project
- Service role keys
- OAuth client secrets
- Real client or taxpayer data
