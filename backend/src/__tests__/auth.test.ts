import { beforeEach, describe, it, expect } from 'vitest';
import * as jwt from 'jsonwebtoken';
import express from 'express';
import request from 'supertest';
import { req, TEST_AUTH } from './test-app';
import { clearRateLimitBuckets } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';
import { clearAllRevocations } from '../services/tokenRevocation';

function protectedProbe() {
  const app = express();
  app.get('/protected', requireAuth, (_req, res) => {
    res.json({ ok: true });
  });
  return request(app);
}

describe('Auth middleware', () => {
  beforeEach(() => {
    // Isolate auth-related counters so the rate limiter and the revocation
    // blocklist do not leak state across test files in the same suite.
    clearRateLimitBuckets();
    clearAllRevocations();
  });

  it('rejects requests without Authorization header → 401', async () => {
    const res = await req.get('/api/clients');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects requests without Bearer prefix → 401', async () => {
    const res = await req
      .get('/api/clients')
      .set({ Authorization: 'test-api-key-for-testing' });
    expect(res.status).toBe(401);
  });

  it('rejects requests with invalid token → 401', async () => {
    const res = await req
      .get('/api/clients')
      .set({ Authorization: 'Bearer wrong-key' });
    expect(res.status).toBe(401);
  });

  it('accepts requests with valid API_KEY token → passes through', async () => {
    const res = await protectedProbe()
      .get('/protected')
      .set(TEST_AUTH.headers);
    expect(res.status).toBe(200);
  });

  it('logs in with local admin credentials and returns a local principal', async () => {
    const res = await req
      .post('/api/auth/login')
      .send({ email: process.env.ADMIN_USER, password: process.env.ADMIN_PASS });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      role: 'admin',
      authSource: 'local',
    });
  });

  it('reports provider readiness without exposing configuration values', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_JWT_SECRET;
    delete process.env.SUPABASE_JWKS_URL;

    const res = await req.get('/api/auth/providers');

    expect(res.status).toBe(200);
    expect(res.body.providers).toContainEqual(expect.objectContaining({
      id: 'supabase',
      configured: false,
      available: false,
    }));
    expect(JSON.stringify(res.body)).not.toContain('SUPABASE_JWT_SECRET=');
    expect(JSON.stringify(res.body)).not.toContain('SUPABASE_ANON_KEY=');
  });

  it('verifies provider JWTs without treating provider metadata as admin grants', async () => {
    process.env.SUPABASE_JWT_SECRET = 'supabase_test_secret_12345678901234567890';
    const token = jwt.sign(
      {
        sub: 'supabase-user-001',
        email: 'asesor@despacho.mx',
        app_metadata: { collecta_role: 'admin' },
      },
      process.env.SUPABASE_JWT_SECRET,
      { expiresIn: '1h' },
    );

    const res = await req
      .post('/api/auth/verify')
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      id: 'supabase-user-001',
      email: 'asesor@despacho.mx',
      role: 'asesor',
      authSource: 'supabase',
    });
  });

  it('ignores Supabase user_metadata for provider authorization roles', async () => {
    process.env.SUPABASE_JWT_SECRET = 'supabase_test_secret_12345678901234567890';
    const token = jwt.sign(
      {
        sub: 'supabase-user-002',
        email: 'editable@despacho.mx',
        user_metadata: { collecta_role: 'admin' },
      },
      process.env.SUPABASE_JWT_SECRET,
      { expiresIn: '1h' },
    );

    const res = await req
      .post('/api/auth/verify')
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      id: 'supabase-user-002',
      email: 'editable@despacho.mx',
      role: 'asesor',
      authSource: 'supabase',
    });
  });

  it('protects all client endpoints', async () => {
    const endpoints = [
      { method: 'get', path: '/api/clients' },
      { method: 'post', path: '/api/clients' },
      { method: 'get', path: '/api/clients/some-id' },
      { method: 'put', path: '/api/clients/some-id' },
      { method: 'delete', path: '/api/clients/some-id' },
      { method: 'patch', path: '/api/clients/some-id/toggle-status' },
    ];

    for (const ep of endpoints) {
      const res = await (req as any)[ep.method](ep.path);
      expect(res.status).toBe(401);
    }
  });

  it('protects all operation endpoints', async () => {
    const endpoints = [
      { method: 'get', path: '/api/operations' },
      { method: 'post', path: '/api/operations' },
      { method: 'get', path: '/api/operations/stats/summary' },
    ];

    for (const ep of endpoints) {
      const res = await (req as any)[ep.method](ep.path);
      expect(res.status).toBe(401);
    }
  });

  it('protects config endpoints', async () => {
    const res = await req.get('/api/config');
    expect(res.status).toBe(401);
  });

  it('protects logs endpoints', async () => {
    const res = await req.get('/api/logs');
    expect(res.status).toBe(401);
  });
});
