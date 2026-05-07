import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanupE2EData, seedE2ECollectionsFixture } from './fixtures/e2eCollectionsFixture';
import { prisma, req, TEST_AUTH } from './test-app';

describe('Collections E2E: logs route', () => {
  beforeEach(async () => {
    await cleanupE2EData(prisma);
  });

  afterEach(async () => {
    await cleanupE2EData(prisma);
  });

  it('creates and lists an E2E collection log entry', async () => {
    const fixture = await seedE2ECollectionsFixture(prisma);

    const created = await req
      .post('/api/logs')
      .set(TEST_AUTH.headers)
      .send({
        clientId: fixture.clients.primary.id,
        tipo: 'E2E_COLLECTION_LOG',
        resultado: 'ENVIADO',
        mensaje: `E2E log for ${fixture.clients.primary.rfc}`,
        telefono: fixture.clients.primary.telefono,
        modo: 'PRUEBA',
      });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      clientId: fixture.clients.primary.id,
      tipo: 'E2E_COLLECTION_LOG',
      resultado: 'ENVIADO',
      telefono: fixture.clients.primary.telefono,
    });

    const listed = await req
      .get('/api/logs')
      .set(TEST_AUTH.headers);

    expect(listed.status).toBe(200);
    expect(listed.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.body.id,
          tipo: 'E2E_COLLECTION_LOG',
          resultado: 'ENVIADO',
        }),
      ]),
    );
  });
});
