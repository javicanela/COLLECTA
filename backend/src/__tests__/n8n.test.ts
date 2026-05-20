import { beforeEach, describe, it, expect, vi } from 'vitest';

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

import { prisma } from '../lib/prisma';
import { req, TEST_AUTH } from './test-app';

describe('GET /api/n8n/daily-report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.operation.findMany).mockResolvedValue([]);
    vi.mocked(prisma.config.findMany).mockResolvedValue([]);
  });

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

  it('scopes API key automation requests to the requested organization', async () => {
    const res = await req
      .get('/api/n8n/daily-report')
      .set(TEST_AUTH.headers)
      .set('X-Collecta-Organization-Id', 'org-n8n');

    expect(res.status).toBe(200);
    expect(prisma.operation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: 'org-n8n',
        archived: false,
      }),
    }));
    expect(prisma.config.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-n8n' },
    });
  });
});
