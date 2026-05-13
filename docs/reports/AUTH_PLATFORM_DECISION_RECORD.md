# Auth Platform Decision Record

Date: 2026-05-13
Product: Collecta

## Decision

Collecta keeps three auth modes:

1. Local admin login for development, QA, and emergency access.
2. API key bearer auth for n8n and service automation.
3. Provider JWT auth behind an adapter, with Supabase Auth as the preferred future provider.

Supabase Auth is the recommended direction because it has a free tier, OAuth/email support, JWT-based sessions, and a natural fit with Collecta's PostgreSQL/Neon direction. The implementation keeps Supabase code inside auth provider adapters instead of scattering provider logic across routes and views.

## Alternatives Considered

Supabase Auth:

- Best fit for free SaaS identity.
- Supports OAuth and email flows.
- Backend can verify JWTs without changing protected route contracts.
- Requires user confirmation before project creation, callback URLs, or hosted env changes.

Firebase Auth:

- Viable fallback if Supabase access is unavailable.
- Strong identity product, but less aligned with the current PostgreSQL/Neon path.
- Would still need the same adapter boundary.

Local admin only:

- Must remain for local and test flows.
- Not sufficient as the long-term SaaS identity layer.

## Current Contract

Protected backend routes accept:

- Local JWTs issued by `/api/auth/login`.
- `Authorization: Bearer <API_KEY>` for service automation.
- Supabase-compatible JWTs when backend provider verification env vars are configured.

The normalized backend principal shape is:

```ts
{
  userId: string;
  email?: string;
  role: 'admin' | 'asesor' | 'viewer' | 'service';
  authSource: 'local' | 'api_key' | 'supabase' | 'test';
}
```

Provider metadata is not allowed to grant admin automatically. New provider users default to `asesor` unless the backend later maps them to an existing trusted user record.

## Confirmation Gates

Ask the user before:

- Creating a Supabase project.
- Registering OAuth apps.
- Editing callback URLs in Supabase, Google, Vercel, or Railway.
- Adding hosted env vars.
- Connecting GitHub, Railway, Vercel, Supabase, Firebase, or Neon accounts.
- Deploying or promoting any environment.

## Secret Safety

No secrets belong in Git, docs, UI, test output, or error responses. This decision record names expected env vars only and does not include real values.
