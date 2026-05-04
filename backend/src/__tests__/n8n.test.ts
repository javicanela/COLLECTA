import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/prisma', () => ({
  prisma: {
    operation: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    config: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { req, TEST_AUTH } from './test-app';

describe('GET /api/n8n/daily-report', () => {
  it('rejects missing auth and accepts a valid API key', async () => {
    const missingAuth = await req.get('/api/n8n/daily-report');
    expect(missingAuth.status).toBe(401);
    expect(missingAuth.body).toHaveProperty('error');

    const validAuth = await req
      .get('/api/n8n/daily-report')
      .set(TEST_AUTH.headers);

    expect(validAuth.status).toBe(200);
    expect(validAuth.body).toHaveProperty('summary');
    expect(validAuth.body).toHaveProperty('mensajeFormateado');
  });
});
