import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test_jwt_secret_123456789012345678901234567890';
process.env.ADMIN_USER = process.env.ADMIN_USER || 'admin';
process.env.ADMIN_PASS = process.env.ADMIN_PASS || 'test-admin-password';

import authRoutes from '../routes/auth';
import { clearRateLimitBuckets } from '../middleware/rateLimit';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return request(app);
}

describe('auth rate limiting', () => {
  beforeEach(() => {
    clearRateLimitBuckets();
  });

  it('returns 429 with Retry-After after 5 failed /login attempts', async () => {
    const client = makeApp();

    for (let i = 0; i < 5; i += 1) {
      const res = await client
        .post('/api/auth/login')
        .send({ email: process.env.ADMIN_USER, password: 'wrong-on-purpose' });
      expect(res.status).toBe(401);
    }

    const blocked = await client
      .post('/api/auth/login')
      .send({ email: process.env.ADMIN_USER, password: 'wrong-on-purpose' });

    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toMatch(/^\d+$/);
    expect(blocked.body.error).toMatch(/login/i);
  });

  it('resets the /login bucket after clearRateLimitBuckets', async () => {
    const client = makeApp();

    for (let i = 0; i < 6; i += 1) {
      await client
        .post('/api/auth/login')
        .send({ email: process.env.ADMIN_USER, password: 'wrong' });
    }

    clearRateLimitBuckets();

    const res = await client
      .post('/api/auth/login')
      .send({ email: process.env.ADMIN_USER, password: 'wrong' });

    expect(res.status).toBe(401);
  });

  it('does not block successful /login below the threshold', async () => {
    const client = makeApp();

    const res = await client
      .post('/api/auth/login')
      .send({ email: process.env.ADMIN_USER, password: process.env.ADMIN_PASS });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('allows 60 /verify hits per minute and blocks the 61st', async () => {
    const client = makeApp();
    const bogusToken = 'Bearer not-a-real-token';

    for (let i = 0; i < 60; i += 1) {
      const res = await client
        .post('/api/auth/verify')
        .set({ Authorization: bogusToken });
      expect([200, 401, 500]).toContain(res.status);
    }

    const blocked = await client
      .post('/api/auth/verify')
      .set({ Authorization: bogusToken });

    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toMatch(/^\d+$/);
  });
});
