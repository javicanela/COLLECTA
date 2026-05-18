import * as jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma, req } from './test-app';

let suffix = 0;

function nextId(prefix: string) {
  suffix += 1;
  return `${prefix}-${Date.now()}-${suffix}`;
}

function authFor(userId: string, organizationId: string) {
  const token = jwt.sign(
    {
      userId,
      email: `${userId}@example.test`,
      role: 'admin',
      organizationId,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h' },
  );

  return { Authorization: `Bearer ${token}` };
}

async function createOrg(name: string) {
  return prisma.organization.create({
    data: {
      nombre: name,
      slug: nextId(name.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
    },
  });
}

describe('multi-tenant route isolation', () => {
  let orgA: Awaited<ReturnType<typeof createOrg>>;
  let orgB: Awaited<ReturnType<typeof createOrg>>;

  beforeEach(async () => {
    orgA = await createOrg('Despacho A');
    orgB = await createOrg('Despacho B');
  });

  it('returns 404 when despacho B asks for a client owned by despacho A', async () => {
    const client = await prisma.client.create({
      data: {
        organizationId: orgA.id,
        rfc: `MTA${String(suffix).padStart(6, '0')}AA1`,
        nombre: 'Cliente privado A',
      },
    });

    const res = await req
      .get(`/api/clients/${client.id}`)
      .set(authFor('admin-b', orgB.id));

    expect(res.status).toBe(404);
  });
});
