import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi, beforeAll } from 'vitest';

vi.mock('../lib/prisma', () => ({
  prisma: {
    organization: {
      create: vi.fn(),
    },
    user: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma';
import authRoutes from '../routes/auth';

function createAuthApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return request(app);
}

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test_jwt_secret_123456789012345678901234567890';
    vi.clearAllMocks();
  });

  it('creates an organization and admin user, then returns a JWT scoped to that organization', async () => {
    vi.mocked(prisma.organization.create).mockResolvedValue({
      id: 'org-001',
      nombre: 'Despacho Robles',
      slug: 'despacho-robles',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'user-001',
      organizationId: 'org-001',
      name: 'Admin Robles',
      email: 'admin@robles.test',
      role: 'admin',
    } as any);

    const res = await createAuthApp()
      .post('/api/auth/signup')
      .send({
        organizationName: 'Despacho Robles',
        name: 'Admin Robles',
        email: 'admin@robles.test',
        password: 'CorrectHorseBatteryStaple1',
      });

    expect(res.status).toBe(201);
    expect(prisma.organization.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ nombre: 'Despacho Robles' }),
    }));
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        organizationId: 'org-001',
        name: 'Admin Robles',
        email: 'admin@robles.test',
        role: 'admin',
        passwordHash: expect.not.stringContaining('CorrectHorseBatteryStaple1'),
      }),
    }));
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      id: 'user-001',
      email: 'admin@robles.test',
      role: 'admin',
      organizationId: 'org-001',
      organizationName: 'Despacho Robles',
    });
  });
});
