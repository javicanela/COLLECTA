import { describe, it, expect } from 'vitest';
import { req, TEST_AUTH, prisma } from './test-app';

// RFC format: 3-4 letters + 6 digits + 2-3 alphanumeric = 11-13 chars
let rfcCounter = 0;
const uniqueRfc = () => {
  rfcCounter++;
  return `XAXX010101${String(rfcCounter).padStart(3, '0')}`;
};

async function createTestClient() {
  return prisma.client.create({
    data: { rfc: uniqueRfc(), nombre: 'Cliente Operaciones' },
  });
}

describe('POST /api/operations', () => {
  it('creates an operation with valid data → 201', async () => {
    const client = await createTestClient();

    const res = await req
      .post('/api/operations')
      .set(TEST_AUTH.headers)
      .send({
        clientId: client.id,
        tipo: 'FISCAL',
        descripcion: 'Declaración Anual 2024',
        monto: 2100,
        fechaVence: '2026-04-15T00:00:00.000Z',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.tipo).toBe('FISCAL');
    expect(res.body.monto).toBe(2100);
    expect(res.body.estatus).toBe('PENDIENTE');
  });

  it('rejects missing clientId → 400', async () => {
    const res = await req
      .post('/api/operations')
      .set(TEST_AUTH.headers)
      .send({
        tipo: 'FISCAL',
        fechaVence: '2026-04-15T00:00:00.000Z',
      });

    expect(res.status).toBe(400);
  });

  it('rejects missing tipo → 400', async () => {
    const client = await createTestClient();

    const res = await req
      .post('/api/operations')
      .set(TEST_AUTH.headers)
      .send({
        clientId: client.id,
        fechaVence: '2026-04-15T00:00:00.000Z',
      });

    expect(res.status).toBe(400);
  });

  it('rejects missing fechaVence → 400', async () => {
    const client = await createTestClient();

    const res = await req
      .post('/api/operations')
      .set(TEST_AUTH.headers)
      .send({
        clientId: client.id,
        tipo: 'FISCAL',
      });

    expect(res.status).toBe(400);
  });

  it('defaults monto to 0 when not provided', async () => {
    const client = await createTestClient();

    const res = await req
      .post('/api/operations')
      .set(TEST_AUTH.headers)
      .send({
        clientId: client.id,
        tipo: 'NÓMINA',
        fechaVence: '2026-05-01T00:00:00.000Z',
      });

    expect(res.status).toBe(201);
    expect(res.body.monto).toBe(0);
  });
});

describe('GET /api/operations', () => {
  it('returns empty array when no operations → 200', async () => {
    const res = await req.get('/api/operations').set(TEST_AUTH.headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('returns operations with calculatedStatus and client data → 200', async () => {
    const client = await createTestClient();

    await prisma.operation.create({
      data: {
        clientId: client.id,
        tipo: 'FISCAL',
        monto: 500,
        fechaVence: new Date('2025-01-01'),
      },
    });

    const res = await req.get('/api/operations').set(TEST_AUTH.headers);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('calculatedStatus');
    expect(res.body[0]).toHaveProperty('diasRestantes');
    expect(res.body[0]).toHaveProperty('client');
  });

  it('filters archived operations', async () => {
    const client = await createTestClient();

    await prisma.operation.create({
      data: {
        clientId: client.id,
        tipo: 'FISCAL',
        monto: 500,
        fechaVence: new Date('2026-12-01'),
        archived: true,
      },
    });

    const resActive = await req
      .get('/api/operations?archived=false')
      .set(TEST_AUTH.headers);
    expect(resActive.status).toBe(200);
    expect(Array.isArray(resActive.body)).toBe(true);

    const resArchived = await req
      .get('/api/operations?archived=true')
      .set(TEST_AUTH.headers);
    expect(resArchived.status).toBe(200);
    expect(resArchived.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('PATCH /api/operations/:id/pay', () => {
  it('marks operation as paid → 200', async () => {
    const client = await createTestClient();

    const op = await prisma.operation.create({
      data: {
        clientId: client.id,
        tipo: 'FISCAL',
        monto: 1000,
        fechaVence: new Date('2026-06-01'),
      },
    });

    const res = await req
      .patch(`/api/operations/${op.id}/pay`)
      .set(TEST_AUTH.headers);

    expect(res.status).toBe(200);
    expect(res.body.estatus).toBe('PAGADO');
    expect(res.body.fechaPago).toBeTruthy();
  });
});

describe('PATCH /api/operations/:id/archive', () => {
  it('archives an operation → 200', async () => {
    const client = await createTestClient();

    const op = await prisma.operation.create({
      data: {
        clientId: client.id,
        tipo: 'FISCAL',
        monto: 1000,
        fechaVence: new Date('2026-06-01'),
      },
    });

    const res = await req
      .patch(`/api/operations/${op.id}/archive`)
      .set(TEST_AUTH.headers);

    expect(res.status).toBe(200);
    expect(res.body.archived).toBe(true);
  });
});

describe('PATCH /api/operations/:id/toggle-exclude', () => {
  it('toggles exclude flag → 200', async () => {
    const client = await createTestClient();

    const op = await prisma.operation.create({
      data: {
        clientId: client.id,
        tipo: 'FISCAL',
        monto: 1000,
        fechaVence: new Date('2026-06-01'),
      },
    });

    const res = await req
      .patch(`/api/operations/${op.id}/toggle-exclude`)
      .set(TEST_AUTH.headers);

    expect(res.status).toBe(200);
    expect(res.body.excluir).toBe(true);
  });
});

describe('DELETE /api/operations/:id', () => {
  it('deletes an operation → 200', async () => {
    const client = await createTestClient();

    const op = await prisma.operation.create({
      data: {
        clientId: client.id,
        tipo: 'FISCAL',
        monto: 1000,
        fechaVence: new Date('2026-06-01'),
      },
    });

    const res = await req
      .delete(`/api/operations/${op.id}`)
      .set(TEST_AUTH.headers);

    expect(res.status).toBe(200);

    const deleted = await prisma.operation.findUnique({
      where: { id: op.id },
    });
    expect(deleted).toBeNull();
  });
});

describe('GET /api/operations/stats/summary', () => {
  it('returns stats with counts → 200', async () => {
    const client = await createTestClient();

    await prisma.operation.create({
      data: {
        clientId: client.id,
        tipo: 'FISCAL',
        monto: 1000,
        fechaVence: new Date('2025-01-01'),
      },
    });

    const res = await req
      .get('/api/operations/stats/summary')
      .set(TEST_AUTH.headers);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('vencidos');
    expect(res.body).toHaveProperty('hoyVence');
    expect(res.body).toHaveProperty('porVencer');
    expect(res.body).toHaveProperty('alCorriente');
    expect(res.body).toHaveProperty('pagados');
    expect(res.body).toHaveProperty('montoTotal');
  });

  it('returns zero counts when no operations', async () => {
    const res = await req
      .get('/api/operations/stats/summary')
      .set(TEST_AUTH.headers);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.montoTotal).toBe(0);
  });
});
