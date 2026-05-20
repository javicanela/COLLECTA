import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import configRoutes from '../routes/config';
import type { AuthenticatedPrincipal } from '../middleware/auth';

vi.mock('../lib/prisma', () => ({
  prisma: {
    logEntry: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    operation: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    client: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    config: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
  },
}));

import { prisma } from '../lib/prisma';

function buildConfigApp(user: Partial<AuthenticatedPrincipal>) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = {
      userId: user.userId || 'test-user',
      email: user.email || 'admin@collecta.test',
      role: user.role || 'viewer',
      authSource: user.authSource || 'local',
      organizationId: user.organizationId || 'org-test',
    };
    next();
  });
  app.use('/api/config', configRoutes);
  return request(app);
}

describe('destructive config routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects destructive purge for service tokens even with the confirm header', async () => {
    const res = await buildConfigApp({ role: 'service', authSource: 'api_key' })
      .post('/api/config/purge')
      .set('X-Admin-Confirm', 'yes-delete-all')
      .send({ type: 'logs' });

    expect(res.status).toBe(403);
    expect(prisma.logEntry.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects destructive purge for admins until the explicit confirm header is present', async () => {
    const res = await buildConfigApp({ role: 'admin' })
      .post('/api/config/purge')
      .send({ type: 'logs' });

    expect(res.status).toBe(403);
    expect(prisma.logEntry.deleteMany).not.toHaveBeenCalled();
  });

  it('allows confirmed admins to purge only within their organization scope', async () => {
    const res = await buildConfigApp({ role: 'admin', organizationId: 'org-admin' })
      .post('/api/config/purge')
      .set('X-Admin-Confirm', 'yes-delete-all')
      .send({ type: 'logs' });

    expect(res.status).toBe(200);
    expect(prisma.logEntry.deleteMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-admin' },
    });
  });
});
