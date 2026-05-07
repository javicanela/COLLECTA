import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanupE2EData, seedE2ECollectionsFixture } from './fixtures/e2eCollectionsFixture';
import { prisma, req, TEST_AUTH } from './test-app';

describe('Collections E2E: payment detection route', () => {
  beforeEach(async () => {
    await cleanupE2EData(prisma);
  });

  afterEach(async () => {
    await cleanupE2EData(prisma);
  });

  it('marks a safely matched E2E operation as paid', async () => {
    const fixture = await seedE2ECollectionsFixture(prisma);
    const target = fixture.operations.porVencer;

    const res = await req
      .post('/api/n8n/payment-detections')
      .set(TEST_AUTH.headers)
      .send({
        rfc: fixture.clients.primary.rfc,
        monto: target.monto,
        fechaPago: '2026-05-06',
        referencia: 'E2E-PAYMENT-REFERENCE-001',
        provider: 'e2e-fixture',
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      matched: true,
      reviewRequired: false,
      status: 'ACCEPTED',
      operationId: target.id,
    });

    const updated = await prisma.operation.findUnique({ where: { id: target.id } });
    expect(updated?.estatus).toBe('PAGADO');
    expect(updated?.fechaPago?.toISOString()).toBe('2026-05-06T00:00:00.000Z');
  });
});
