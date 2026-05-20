import express from 'express';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/authProvider', () => ({
  verifyProviderToken: vi.fn(),
}));

import { verifyProviderToken } from '../services/authProvider';
import { requireAdminConfirm, requireAuth } from '../middleware/auth';
import type { AuthenticatedPrincipal } from '../services/authTypes';

const verifyProviderTokenMock = vi.mocked(verifyProviderToken);

function createProtectedApp() {
  const app = express();
  app.use(express.json());
  app.get('/protected', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });
  return request(app);
}

function createAdminRouteApp(principal: AuthenticatedPrincipal | undefined) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (principal) {
      req.user = principal;
    }
    next();
  });
  app.post('/admin/wipe', requireAdminConfirm, (_req, res) => {
    res.json({ wiped: true });
  });
  return request(app);
}

describe('auth middleware principal contract', () => {
  beforeEach(() => {
    process.env.API_KEY = 'test_api_key_12345678901234567890';
    process.env.JWT_SECRET = 'test_jwt_secret_123456789012345678901234567890';
    verifyProviderTokenMock.mockReset();
    verifyProviderTokenMock.mockResolvedValue(null);
  });

  it('maps API key authentication to the service principal shape', async () => {
    const res = await createProtectedApp()
      .get('/protected')
      .set({ Authorization: `Bearer ${process.env.API_KEY}` });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      userId: 'api-key',
      role: 'service',
      authSource: 'api_key',
    });
  });

  it('maps API key automation organization header into the service principal', async () => {
    const res = await createProtectedApp()
      .get('/protected')
      .set({
        Authorization: `Bearer ${process.env.API_KEY}`,
        'X-Collecta-Organization-Id': 'org-automation',
      });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      userId: 'api-key',
      role: 'service',
      authSource: 'api_key',
      organizationId: 'org-automation',
    });
  });

  it('rejects unsafe API key organization headers', async () => {
    const res = await createProtectedApp()
      .get('/protected')
      .set({
        Authorization: `Bearer ${process.env.API_KEY}`,
        'X-Collecta-Organization-Id': '../org',
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'organization_id_invalid' });
  });

  it('maps local JWT organizationId into the authenticated principal', async () => {
    const token = jwt.sign(
      {
        userId: 'user-despacho-a',
        email: 'admin@despacho-a.test',
        role: 'admin',
        organizationId: 'org-despacho-a',
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' },
    );

    const res = await createProtectedApp()
      .get('/protected')
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      userId: 'user-despacho-a',
      email: 'admin@despacho-a.test',
      role: 'admin',
      authSource: 'local',
      organizationId: 'org-despacho-a',
    });
  });

  it('accepts a mocked provider token without requiring Supabase env vars', async () => {
    verifyProviderTokenMock.mockResolvedValue({
      userId: 'external-user-001',
      email: 'asesor@despacho.mx',
      role: 'asesor',
      authSource: 'supabase',
    });

    const res = await createProtectedApp()
      .get('/protected')
      .set({ Authorization: 'Bearer provider-token' });

    expect(res.status).toBe(200);
    expect(verifyProviderTokenMock).toHaveBeenCalledWith('provider-token');
    expect(res.body.user).toMatchObject({
      userId: 'external-user-001',
      email: 'asesor@despacho.mx',
      role: 'asesor',
      authSource: 'supabase',
    });
  });

  it('rejects invalid bearer tokens without echoing token details', async () => {
    const res = await createProtectedApp()
      .get('/protected')
      .set({ Authorization: 'Bearer wrong-key' });

    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toContain('wrong-key');
  });
});

describe('Bug 9 - JWT_SECRET length validation', () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalApiKey = process.env.API_KEY;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
    if (originalApiKey === undefined) {
      delete process.env.API_KEY;
    } else {
      process.env.API_KEY = originalApiKey;
    }
    verifyProviderTokenMock.mockReset();
    verifyProviderTokenMock.mockResolvedValue(null);
  });

  it('returns 500 when JWT_SECRET is configured but shorter than 32 chars', async () => {
    process.env.JWT_SECRET = 'short';
    // Even with a valid API_KEY, we should fail loud rather than silently
    // fall back. Brute forcing a short secret is the real attack here.
    process.env.API_KEY = 'fallback_key_that_should_not_be_used_12345';

    const res = await createProtectedApp()
      .get('/protected')
      .set({ Authorization: 'Bearer anything' });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/JWT_SECRET/);
    expect(res.body.error).toMatch(/32/);
    // Never echo the secret value.
    expect(JSON.stringify(res.body)).not.toContain('short');
  });
});

describe('Bug 11 - requireAdminConfirm enforces role then header', () => {
  it('rejects non-admin principals with the right header (403 role)', async () => {
    const asesor: AuthenticatedPrincipal = {
      userId: 'asesor-001',
      email: 'asesor@collecta.local',
      role: 'asesor',
      authSource: 'local',
    };

    const res = await createAdminRouteApp(asesor)
      .post('/admin/wipe')
      .set({ 'X-Admin-Confirm': 'yes-delete-all' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin/i);
  });

  it('rejects admin principal without the confirmation header (403 header)', async () => {
    const admin: AuthenticatedPrincipal = {
      userId: 'admin-001',
      email: 'admin@collecta.local',
      role: 'admin',
      authSource: 'local',
    };

    const res = await createAdminRouteApp(admin).post('/admin/wipe');

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/X-Admin-Confirm/i);
  });

  it('rejects requests without an authenticated principal', async () => {
    const res = await createAdminRouteApp(undefined)
      .post('/admin/wipe')
      .set({ 'X-Admin-Confirm': 'yes-delete-all' });

    expect(res.status).toBe(403);
  });

  it('accepts admin principal with the right header', async () => {
    const admin: AuthenticatedPrincipal = {
      userId: 'admin-001',
      email: 'admin@collecta.local',
      role: 'admin',
      authSource: 'local',
    };

    const res = await createAdminRouteApp(admin)
      .post('/admin/wipe')
      .set({ 'X-Admin-Confirm': 'yes-delete-all' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ wiped: true });
  });
});
