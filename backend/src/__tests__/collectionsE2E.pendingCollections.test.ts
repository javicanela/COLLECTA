import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanupE2EData, E2E_RFC_PREFIX, seedE2ECollectionsFixture } from './fixtures/e2eCollectionsFixture';
import { prisma, req, TEST_AUTH } from './test-app';

describe('Collections E2E: pending collections', () => {
  beforeEach(async () => {
    await cleanupE2EData(prisma);
  });

  afterEach(async () => {
    await cleanupE2EData(prisma);
  });

  it('returns only vencida, hoy and por vencer E2E operations', async () => {
    const fixture = await seedE2ECollectionsFixture(prisma);

    const res = await req
      .get('/api/n8n/pending-collections')
      .set(TEST_AUTH.headers);

    expect(res.status).toBe(200);
    const collections = res.body.collections.filter((item: { clienteRfc: string }) =>
      item.clienteRfc.startsWith(E2E_RFC_PREFIX),
    );

    expect(collections).toHaveLength(3);
    expect(collections.map((item: { status: string }) => item.status).sort()).toEqual([
      'HOY_VENCE',
      'POR_VENCER',
      'VENCIDO',
    ]);
    expect(collections.map((item: { operationId: string }) => item.operationId)).toEqual(
      expect.arrayContaining([
        fixture.operations.vencida.id,
        fixture.operations.hoy.id,
        fixture.operations.porVencer.id,
      ]),
    );
    expect(collections.map((item: { operationId: string }) => item.operationId)).not.toEqual(
      expect.arrayContaining([
        fixture.operations.excluida.id,
        fixture.operations.pagada.id,
        fixture.operations.archivada.id,
      ]),
    );
  });
});
