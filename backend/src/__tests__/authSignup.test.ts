import express from 'express';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASS;
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

  it('logs in a database user created through signup and preserves organization scope through verify', async () => {
    let savedUser: any;

    vi.mocked(prisma.organization.create).mockResolvedValue({
      id: 'org-002',
      nombre: 'Despacho Nogales',
      slug: 'despacho-nogales',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (prisma.user.create as any).mockImplementation(async ({ data }: any) => {
      savedUser = {
        id: 'user-002',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      return savedUser;
    });
    (prisma.user.findFirst as any).mockImplementation(async ({ where }: any) => {
      if (where.email === savedUser.email) {
        return {
          ...savedUser,
          organization: {
            id: 'org-002',
            nombre: 'Despacho Nogales',
            slug: 'despacho-nogales',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };
      }
      return null;
    });

    const agent = createAuthApp();

    const signup = await agent
      .post('/api/auth/signup')
      .send({
        organizationName: 'Despacho Nogales',
        name: 'Admin Nogales',
        email: 'Admin@Nogales.test',
        password: 'CorrectHorseBatteryStaple2',
      });

    expect(signup.status).toBe(201);

    const login = await agent
      .post('/api/auth/login')
      .send({
        email: 'admin@nogales.test',
        password: 'CorrectHorseBatteryStaple2',
      });

    expect(login.status).toBe(200);
    expect(login.body.user).toMatchObject({
      id: 'user-002',
      email: 'admin@nogales.test',
      role: 'admin',
      organizationId: 'org-002',
      organizationName: 'Despacho Nogales',
    });

    const decoded = jwt.verify(login.body.token, process.env.JWT_SECRET as string) as { organizationId?: string };
    expect(decoded.organizationId).toBe('org-002');

    const verify = await agent
      .post('/api/auth/verify')
      .set({ Authorization: `Bearer ${login.body.token}` });

    expect(verify.status).toBe(200);
    expect(verify.body.user).toMatchObject({
      id: 'user-002',
      organizationId: 'org-002',
    });
  });
});
