import { describe, it, expect } from 'vitest';
import { req, TEST_AUTH } from './test-app';

describe('Auth middleware', () => {
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
    const res = await req
      .get('/api/clients')
      .set(TEST_AUTH.headers);
    expect(res.status).toBe(200);
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
