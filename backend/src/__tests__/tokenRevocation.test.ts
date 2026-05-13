import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test_jwt_secret_123456789012345678901234567890';
process.env.ADMIN_USER = process.env.ADMIN_USER || 'admin';
process.env.ADMIN_PASS = process.env.ADMIN_PASS || 'test-admin-password';

import authRoutes from '../routes/auth';
import { requireAuth } from '../middleware/auth';
import {
  clearAllRevocations,
  isRevoked,
  revokeJti,
} from '../services/tokenRevocation';
import { clearRateLimitBuckets } from '../middleware/rateLimit';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.get('/protected', requireAuth, (req, res) => {
    res.json({ ok: true, user: req.user });
  });
  return request(app);
}

async function login(client: ReturnType<typeof makeApp>): Promise<string> {
  const res = await client
    .post('/api/auth/login')
    .send({ email: process.env.ADMIN_USER, password: process.env.ADMIN_PASS });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

describe('tokenRevocation service', () => {
  beforeEach(() => {
    clearAllRevocations();
  });

  it('does not consider unknown jti as revoked', () => {
    expect(isRevoked('never-revoked')).toBe(false);
  });

  it('flags a jti as revoked after revokeJti', () => {
    revokeJti('jti-a');
    expect(isRevoked('jti-a')).toBe(true);
  });

  it('treats empty or missing jti as not revoked', () => {
    expect(isRevoked(undefined)).toBe(false);
    expect(isRevoked(null)).toBe(false);
    expect(isRevoked('')).toBe(false);
  });

  it('expires revocation entries after the configured TTL', () => {
    revokeJti('jti-short', 1);
    // Sleep busy-wait for at least 2ms.
    const end = Date.now() + 3;
    while (Date.now() < end) {
      // no-op
    }
    expect(isRevoked('jti-short')).toBe(false);
  });
});

describe('logout + revocation end-to-end', () => {
  beforeEach(() => {
    clearAllRevocations();
    clearRateLimitBuckets();
  });

  it('blocks a revoked token from accessing protected routes', async () => {
    const client = makeApp();
    const token = await login(client);

    const okBefore = await client
      .get('/protected')
      .set({ Authorization: `Bearer ${token}` });
    expect(okBefore.status).toBe(200);

    const logoutRes = await client
      .post('/api/auth/logout')
      .set({ Authorization: `Bearer ${token}` });
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body).toMatchObject({ revoked: true });

    const blocked = await client
      .get('/protected')
      .set({ Authorization: `Bearer ${token}` });
    expect(blocked.status).toBe(401);
    expect(blocked.body.error).toMatch(/revocado/i);
  });

  it('still responds 200 from /logout when token is missing jti', async () => {
    const client = makeApp();
    const res = await client
      .post('/api/auth/logout')
      .set({ Authorization: 'Bearer not-a-real-token' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ revoked: true });
  });
});
